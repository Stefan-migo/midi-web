#!/usr/bin/env node
/**
 * Contract check for the live-viewer photo source: the pure helpers in
 * `api/_lib/drive.mjs` and the HTTP handler in `api/fotos.mjs`.
 *
 * The viewer runs during an event, so the failure modes that matter are the
 * boring ones: a folder link that nobody normalised, a key leaking into a
 * response, an upstream error served as success, and a cache header that would
 * turn a Drive hiccup into a cached one. None of that needs a browser, so this
 * runs the handler in-process with a stubbed `fetch`, the same way the repo's
 * other checks run against built output.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const failures = [];
let checks = 0;

async function check(name, run) {
  checks += 1;
  try {
    await run();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

/** Minimal Node-style response that records what the handler wrote. */
function recorder() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body = '') {
      this.body = String(body);
    },
  };
}

const ENV = { key: 'test-key-do-not-log', folder: '1OgcyP2FTpRxPdW2Ryu_PxJKZGqPrIJPG' };

function json(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** Replaces global fetch for the duration of one handler call. */
async function withFetch(implementation, run) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

const drive = await import('../api/_lib/drive.mjs').catch((error) => ({ __error: error }));
const handlerModule = await import('../api/fotos.mjs').catch((error) => ({ __error: error }));

if (drive.__error || handlerModule.__error) {
  const missing = [drive.__error, handlerModule.__error].filter(Boolean).map((error) => error.message);
  console.error(`check-viewer-api: the source modules are missing or invalid:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const handler = handlerModule.default;

await check('parseFolderId accepts a bare id', () => {
  assert.equal(drive.parseFolderId(ENV.folder), ENV.folder);
});

await check('parseFolderId accepts the folder link the owner shared', () => {
  const shared = `https://drive.google.com/drive/folders/${ENV.folder}?usp=drive_link`;
  assert.equal(drive.parseFolderId(shared), ENV.folder);
  assert.equal(drive.parseFolderId(`${shared}&hl=es`), ENV.folder);
});

await check('parseFolderId accepts a drive link without the /drive segment', () => {
  assert.equal(drive.parseFolderId(`https://drive.google.com/folders/${ENV.folder}`), ENV.folder);
});

await check('parseFolderId rejects everything that is not a folder', () => {
  for (const value of ['', '   ', 'no-es-una-carpeta', undefined, null, 42]) {
    assert.equal(drive.parseFolderId(value), '', `accepted ${JSON.stringify(value)}`);
  }
  assert.equal(
    drive.parseFolderId('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view'),
    '',
    'accepted a file link',
  );
});

await check('listUrl asks only for images, newest last, with the key', () => {
  const url = new URL(drive.listUrl({ folderId: ENV.folder, apiKey: ENV.key, limit: 60 }));
  assert.equal(url.origin + url.pathname, 'https://www.googleapis.com/drive/v3/files');
  assert.equal(url.searchParams.get('q'), `'${ENV.folder}' in parents and mimeType contains 'image/' and trashed=false`);
  assert.equal(url.searchParams.get('orderBy'), 'createdTime');
  assert.equal(url.searchParams.get('pageSize'), '60');
  assert.equal(url.searchParams.get('key'), ENV.key);
  assert.match(url.searchParams.get('fields') ?? '', /files\(/);
});

await check('listUrl clamps the page size into something Drive accepts', () => {
  const small = new URL(drive.listUrl({ folderId: ENV.folder, apiKey: ENV.key, limit: 0 }));
  const huge = new URL(drive.listUrl({ folderId: ENV.folder, apiKey: ENV.key, limit: 100000 }));
  assert.equal(small.searchParams.get('pageSize'), '1');
  assert.equal(huge.searchParams.get('pageSize'), '200');
});

await check('toPhoto maps a Drive file to the viewer shape', () => {
  const photo = drive.toPhoto({
    id: 'abc',
    name: 'IMG_0728.JPG',
    mimeType: 'image/jpeg',
    createdTime: '2026-11-14T23:10:00.000Z',
  });
  assert.deepEqual(Object.keys(photo).sort(), ['createdAt', 'id', 'name', 'src']);
  assert.equal(photo.id, 'abc');
  assert.equal(photo.name, 'IMG_0728.JPG');
  assert.equal(photo.createdAt, '2026-11-14T23:10:00.000Z');
  assert.equal(photo.src, `https://drive.google.com/thumbnail?id=abc&sz=w2000`);
});

await check('toPhoto drops files Drive lists without an id or a usable date', () => {
  assert.equal(drive.toPhoto({ name: 'x.jpg' }), null);
  assert.equal(drive.toPhoto({ id: 'abc' }), null);
  assert.equal(drive.toPhoto({ id: 'abc', createdTime: 'not-a-date' }), null);
  assert.equal(drive.toPhoto(null), null);
});

await check('mergePhotos keeps one copy of each photo and orders the show oldest first', () => {
  const first = [
    { id: 'b', name: 'b.jpg', createdAt: '2026-11-14T23:05:00.000Z', src: 'sb' },
    { id: 'a', name: 'a.jpg', createdAt: '2026-11-14T23:01:00.000Z', src: 'sa' },
  ];
  const incoming = [
    { id: 'b', name: 'b.jpg', createdAt: '2026-11-14T23:05:00.000Z', src: 'sb' },
    { id: 'c', name: 'c.jpg', createdAt: '2026-11-14T23:09:00.000Z', src: 'sc' },
  ];
  assert.deepEqual(
    drive.mergePhotos(first, incoming).map((photo) => photo.id),
    ['a', 'b', 'c'],
  );
});

const callHandler = async (query, { env = { GOOGLE_DRIVE_API_KEY: ENV.key }, method = 'GET' } = {}) => {
  const saved = {};
  for (const name of ['GOOGLE_DRIVE_API_KEY', 'DRIVE_FOLDER_ID']) {
    saved[name] = process.env[name];
    if (env[name] === undefined) delete process.env[name];
    else process.env[name] = env[name];
  }
  const res = recorder();
  const url = `/api/fotos${query === null ? '' : `?${query ?? ''}`}`;
  try {
    await handler({ method, url, headers: {} }, res);
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  let body = null;
  try {
    body = JSON.parse(res.body);
  } catch {
    body = res.body;
  }
  return { status: res.statusCode, headers: res.headers, body, raw: res.body };
};

await check('without a key the endpoint refuses instead of failing silently', async () => {
  const result = await callHandler(`folder=${ENV.folder}`, { env: {} });
  assert.equal(result.status, 503);
  assert.equal(result.body?.error?.code, 'not_configured');
  assert.equal(result.headers['cache-control'], 'no-store');
});

await check('without a folder it answers 400 and names the folder parameter', async () => {
  const result = await callHandler('', { env: { GOOGLE_DRIVE_API_KEY: ENV.key } });
  assert.equal(result.status, 400);
  assert.equal(result.body?.error?.code, 'invalid_folder');
});

await check('a folder link works as the query value', async () => {
  let requested = '';
  const result = await withFetch(
    async (url) => {
      requested = String(url);
      return json({ files: [] });
    },
    () => callHandler(`folder=${encodeURIComponent(`https://drive.google.com/drive/folders/${ENV.folder}?usp=drive_link`)}`),
  );
  assert.equal(result.status, 200);
  assert.match(requested, new RegExp(ENV.folder));
});

await check('a successful listing is cacheable and carries the photos without the key', async () => {
  const result = await withFetch(
    async () =>
      json({
        files: [
          { id: 'n', name: 'new.jpg', mimeType: 'image/jpeg', createdTime: '2026-11-14T23:20:00.000Z' },
          { id: 'o', name: 'old.jpg', mimeType: 'image/jpeg', createdTime: '2026-11-14T22:00:00.000Z' },
        ],
      }),
    () => callHandler(`folder=${ENV.folder}`),
  );
  assert.equal(result.status, 200);
  assert.match(result.headers['cache-control'] ?? '', /s-maxage=10/);
  assert.match(result.headers['cache-control'] ?? '', /stale-while-revalidate/);
  assert.equal(result.body.count, 2);
  assert.deepEqual(result.body.photos.map((photo) => photo.id), ['o', 'n']);
  assert.equal(result.body.folderId, ENV.folder);
  assert.ok(!result.raw.includes(ENV.key), 'the API key leaked into the response');
});

await check('an empty folder is a success with zero photos, not an error', async () => {
  const result = await withFetch(async () => json({ files: [] }), () => callHandler(`folder=${ENV.folder}`));
  assert.equal(result.status, 200);
  assert.equal(result.body.count, 0);
  assert.deepEqual(result.body.photos, []);
});

await check('a rate-limited upstream is a retryable 503 that is never cached', async () => {
  const result = await withFetch(async () => json({ error: { message: 'quota' } }, 403), () =>
    callHandler(`folder=${ENV.folder}`),
  );
  assert.equal(result.status, 503);
  assert.equal(result.body?.error?.code, 'upstream_rate_limited');
  assert.equal(result.headers['cache-control'], 'no-store');
});

await check('a missing folder upstream is a 404, not a 500', async () => {
  const result = await withFetch(async () => json({ error: { message: 'notFound' } }, 404), () =>
    callHandler(`folder=${ENV.folder}`),
  );
  assert.equal(result.status, 404);
  assert.equal(result.body?.error?.code, 'folder_not_found');
});

await check('any other upstream failure is a 502 that is never cached', async () => {
  const result = await withFetch(async () => json({ error: {} }, 500), () => callHandler(`folder=${ENV.folder}`));
  assert.equal(result.status, 502);
  assert.equal(result.body?.error?.code, 'upstream_failed');
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.ok(!result.raw.includes(ENV.key), 'the API key leaked into an error response');
});

await check('a network failure is a 502, never an exception', async () => {
  const result = await withFetch(async () => {
    throw new Error('ECONNRESET');
  }, () => callHandler(`folder=${ENV.folder}`));
  assert.equal(result.status, 502);
  assert.equal(result.body?.error?.code, 'upstream_failed');
});

await check('the endpoint rejects anything but GET', async () => {
  const result = await callHandler(`folder=${ENV.folder}`, { method: 'POST' });
  assert.equal(result.status, 405);
  assert.equal(result.headers['allow'], 'GET');
});

await check('the handler stays free of build-time imports the browser would need', async () => {
  const source = await readFile(new URL('../api/fotos.mjs', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"][^'"]*\.ts['"]/.test(source), 'the api handler imports TypeScript');
  assert.ok(!/process\.env\.VITE_/.test(source), 'the api handler reads a browser-exposed variable');
});

if (failures.length) {
  console.error(`check-viewer-api: ${failures.length} of ${checks} checks failed`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`check-viewer-api: ${checks} checks passed`);
