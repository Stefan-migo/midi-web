#!/usr/bin/env node
/**
 * Contract check for the individual brief: the pure helpers in
 * `api/_lib/brief.mjs` and the HTTP handler in `api/brief.mjs`.
 *
 * The brief is filled once per member and never again, so the failure modes
 * that matter are silent ones: an answer that gets truncated instead of
 * rejected, a submission accepted without the access code, a service-role key
 * echoed back in a response, or a storage hiccup reported as success. None of
 * that needs a database, so this runs the handler in-process with a stubbed
 * `fetch`, the same way `check-viewer-api.mjs` does.
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

function json(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const ENV = {
  url: 'https://example-project.supabase.co',
  key: 'service-role-key-do-not-log',
  code: 'clave-del-colectivo',
};

const UUID = '6f1c2b9e-7a4d-4a1e-9c3f-2d8b5e0a7c11';

/**
 * A JWT-shaped string, assembled at runtime. Written literally it reads as a
 * real credential to any secret scanner (GitGuardian flagged exactly that), and
 * a fixture must never look like a token.
 */
function jwtFixture() {
  const segment = (text) => Buffer.from(text).toString('base64url');
  return [segment('{"alg":"HS256","typ":"JWT"}'), segment('{"role":"service_role"}'), 'signature'].join('.');
}

/** A non-JWT secret key, joined so the literal never appears in this file. */
const SECRET_FIXTURE = ['sb', 'secret', 'fixture'].join('_');

/** Every environment variable the handler may read. */
const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BRIEF_ACCESS_CODE',
  'BRIEF_ROUND',
];

/** Runs `run` with exactly `env` visible to the handler, then restores it. */
async function withEnv(env, run) {
  const saved = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(env)) process.env[key] = value;
  try {
    return await run();
  } finally {
    for (const key of ENV_KEYS) {
      const previous = saved.get(key);
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
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

function configured() {
  return {
    SUPABASE_URL: ENV.url,
    SUPABASE_SECRET_KEY: ENV.key,
    BRIEF_ACCESS_CODE: ENV.code,
  };
}

function submission(overrides = {}) {
  const answers = {};
  for (const key of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']) {
    answers[key] = `${key} answer`;
  }
  return { nombre: 'Integrante', fecha: '2026-03-14', code: ENV.code, answers, ...overrides };
}

async function callHandler(payload, { method = 'POST', env = configured(), headers = {}, raw } = {}) {
  const response = recorder();
  const body = raw !== undefined ? raw : JSON.stringify(payload);
  const request = {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body,
  };
  await withEnv(env, () => handler(request, response));
  let parsed;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    parsed = undefined;
  }
  return { status: response.statusCode, headers: response.headers, body: parsed, raw: response.body };
}

/** Asserts the call happened and returns what it sent. */
function captured(fallback) {
  return async (url, init) => {
    fallback.url = String(url);
    fallback.init = init;
    fallback.body = init?.body ? JSON.parse(String(init.body)) : undefined;
    return fallback.response ?? (fallback.response = json([{ id: UUID, submitted_at: '2026-03-14T12:00:00.000Z' }], 201));
  };
}

const brief = await import('../api/_lib/brief.mjs').catch((error) => ({ __error: error }));
const handlerModule = await import('../api/brief.mjs').catch((error) => ({ __error: error }));

if (brief.__error || handlerModule.__error) {
  const missing = [brief.__error, handlerModule.__error].filter(Boolean).map((error) => error.message);
  console.error(`check-brief-api: the source modules are missing or invalid:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const handler = handlerModule.default;

await check('the server keeps every question the form asks', () => {
  assert.deepEqual(brief.ANSWER_KEYS, ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']);
});

await check('the answer limit matches the form', async () => {
  const source = await readFile(new URL('../src/brief/questions.ts', import.meta.url), 'utf8');
  const limit = /export const MAX_ANSWER = (\d+)/.exec(source)?.[1];
  assert.ok(limit, 'src/brief/questions.ts no longer declares MAX_ANSWER');
  assert.equal(String(brief.MAX_ANSWER), limit);
});

await check('a submission without the configured environment is refused, never accepted', async () => {
  const result = await withFetch(
    async () => {
      throw new Error('the handler reached the network without configuration');
    },
    () => callHandler(submission(), { env: {} }),
  );
  assert.equal(result.status, 503);
  assert.equal(result.body?.error?.code, 'not_configured');
  assert.deepEqual(
    result.body?.error?.missing,
    ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'BRIEF_ACCESS_CODE'],
    'the failure must name the variables that are missing, so setup is debuggable',
  );
  assert.equal(result.headers['cache-control'], 'no-store');
});

await check('only the missing variable is named, never a configured one', async () => {
  const result = await callHandler(submission(), {
    env: { SUPABASE_URL: ENV.url, BRIEF_ACCESS_CODE: ENV.code },
  });
  assert.equal(result.status, 503);
  assert.deepEqual(result.body?.error?.missing, ['SUPABASE_SECRET_KEY']);
});

await check('the current Supabase key name is what the server reads', async () => {
  const holder = {};
  await withFetch(captured(holder), () => callHandler(submission()));
  assert.equal(holder.init.headers.apikey, ENV.key);
});

await check('the legacy service_role variable still works for older deployments', async () => {
  const holder = {};
  const result = await withFetch(
    async (_url, init) => {
      holder.init = init;
      return json([{ id: UUID, submitted_at: '2026-03-14T12:00:00.000Z' }], 201);
    },
    () =>
      callHandler(submission(), {
        env: {
          SUPABASE_URL: ENV.url,
          SUPABASE_SERVICE_ROLE_KEY: 'legacy-key',
          BRIEF_ACCESS_CODE: ENV.code,
        },
      }),
  );
  assert.equal(result.status, 201);
  assert.equal(holder.init.headers.apikey, 'legacy-key');
});

await check('the current key name wins when both are configured', async () => {
  const holder = {};
  await withFetch(
    async (_url, init) => {
      holder.init = init;
      return json([{ id: UUID, submitted_at: '2026-03-14T12:00:00.000Z' }], 201);
    },
    () =>
      callHandler(submission(), {
        env: { ...configured(), SUPABASE_SERVICE_ROLE_KEY: 'legacy-key' },
      }),
  );
  assert.equal(holder.init.headers.apikey, ENV.key);
});

await check('a wrong access code is rejected before anything is stored', async () => {
  let called = false;
  const result = await withFetch(
    async () => {
      called = true;
      return json([]);
    },
    () => callHandler(submission({ code: 'otra-cosa' })),
  );
  assert.equal(result.status, 401);
  assert.equal(result.body?.error?.code, 'invalid_access_code');
  assert.equal(called, false, 'the handler stored a submission with a wrong access code');
});

await check('a missing access code is not a bypass', async () => {
  const result = await callHandler(submission({ code: '' }));
  assert.equal(result.status, 401);
  assert.equal(result.body?.error?.code, 'invalid_access_code');
});

await check('a submission without a name names the missing field', async () => {
  const result = await callHandler(submission({ nombre: '   ' }));
  assert.equal(result.status, 400);
  assert.equal(result.body?.error?.code, 'validation_failed');
  assert.equal(result.body?.error?.fields?.nombre, 'required');
});

await check('a name over the limit is rejected instead of truncated', async () => {
  const result = await callHandler(submission({ nombre: 'x'.repeat(brief.MAX_NAME + 1) }));
  assert.equal(result.status, 400);
  assert.equal(result.body?.error?.fields?.nombre, 'too_long');
});

await check('an answer over the limit is rejected and named', async () => {
  const result = await callHandler(
    submission({ answers: { ...submission().answers, q4: 'x'.repeat(brief.MAX_ANSWER + 1) } }),
  );
  assert.equal(result.status, 400);
  assert.equal(result.body?.error?.fields?.q4, 'too_long');
});

await check('an empty brief is refused rather than stored as a blank row', async () => {
  const empty = {};
  for (const key of brief.ANSWER_KEYS) empty[key] = '   ';
  const result = await callHandler(submission({ answers: empty }));
  assert.equal(result.status, 400);
  assert.equal(result.body?.error?.fields?.answers, 'required');
});

await check('a partial brief is accepted: open questions are explicitly allowed', async () => {
  const answers = {};
  for (const key of brief.ANSWER_KEYS) answers[key] = key === 'q1' ? 'Una frase.' : '';
  const result = await withFetch(captured({}), () => callHandler(submission({ answers })));
  assert.equal(result.status, 201);
});

await check('a malformed date is rejected', async () => {
  const result = await callHandler(submission({ fecha: '14/03/2026' }));
  assert.equal(result.status, 400);
  assert.equal(result.body?.error?.fields?.fecha, 'invalid');
});

await check('the stored row keeps the round and every answer verbatim', async () => {
  const holder = {};
  const answers = { ...submission().answers, q2: 'Primera línea.\n\nSegunda línea.' };
  const result = await withFetch(captured(holder), () => callHandler(submission({ answers })));
  assert.equal(result.status, 201);
  assert.match(holder.url, /^https:\/\/example-project\.supabase\.co\/rest\/v1\/brief_responses$/);
  assert.equal(holder.init.method, 'POST');
  assert.equal(holder.init.headers.apikey, ENV.key);
  assert.match(String(holder.init.headers.prefer), /return=representation/);
  assert.equal(holder.body.q2, 'Primera línea.\n\nSegunda línea.');
  assert.equal(holder.body.nombre, 'Integrante');
  assert.equal(holder.body.fecha, '2026-03-14');
  assert.equal(holder.body.round, 'fundamentos');
  assert.equal(result.body.id, UUID);
});

await check('the stored submission never echoes the service-role key', async () => {
  const result = await withFetch(captured({}), () => callHandler(submission()));
  assert.ok(!result.raw.includes(ENV.key), 'the service-role key leaked into the response');
});

await check('a secret key travels in apikey only: it is not a JWT', async () => {
  const holder = {};
  const secret = SECRET_FIXTURE;
  await withFetch(
    async (_url, init) => {
      holder.init = init;
      return json([{ id: UUID, submitted_at: '2026-03-14T12:00:00.000Z' }], 201);
    },
    () =>
      callHandler(submission(), {
        env: { ...configured(), SUPABASE_SECRET_KEY: secret },
      }),
  );
  assert.equal(holder.init.headers.apikey, secret);
  assert.equal(
    holder.init.headers.authorization,
    undefined,
    'a non-JWT secret key must not be sent as a bearer token: PostgREST answers PGRST301',
  );
});

await check('a legacy service_role JWT is accepted in both headers', async () => {
  const holder = {};
  const jwt = jwtFixture();
  await withFetch(
    async (_url, init) => {
      holder.init = init;
      return json([{ id: UUID, submitted_at: '2026-03-14T12:00:00.000Z' }], 201);
    },
    () => callHandler(submission(), { env: { ...configured(), SUPABASE_SECRET_KEY: jwt } }),
  );
  assert.equal(holder.init.headers.apikey, jwt);
  assert.equal(holder.init.headers.authorization, `Bearer ${jwt}`);
});

await check('updating an existing answer targets that row', async () => {
  const holder = { response: json([{ id: UUID, submitted_at: '2026-03-14T12:10:00.000Z' }], 200) };
  const result = await withFetch(captured(holder), () => callHandler(submission({ id: UUID }), { method: 'PATCH' }));
  assert.equal(result.status, 200);
  assert.equal(holder.init.method, 'PATCH');
  assert.match(holder.url, new RegExp(`id=eq\\.${UUID}$`));
  assert.equal(holder.body.id, undefined, 'the row id must not travel in the update payload');
});

await check('updating an answer that no longer exists is a 404, not a silent success', async () => {
  const result = await withFetch(
    async (_url, init) => (init?.method === 'PATCH' ? json([], 200) : json([])),
    () => callHandler(submission({ id: UUID }), { method: 'PATCH' }),
  );
  assert.equal(result.status, 404);
  assert.equal(result.body?.error?.code, 'response_not_found');
});

await check('an update with a malformed id never reaches storage', async () => {
  let called = false;
  const result = await withFetch(
    async () => {
      called = true;
      return json([]);
    },
    () => callHandler(submission({ id: 'not-a-uuid' }), { method: 'PATCH' }),
  );
  assert.equal(result.status, 400);
  assert.equal(result.body?.error?.code, 'invalid_id');
  assert.equal(called, false, 'the handler queried storage with an invalid id');
});

await check('an oversized body is refused before parsing', async () => {
  const result = await callHandler(submission(), {
    raw: JSON.stringify(submission()).padEnd(brief.MAX_BODY + 1024, ' '),
  });
  assert.equal(result.status, 413);
  assert.equal(result.body?.error?.code, 'payload_too_large');
});

await check('an upstream failure is a 502 and is never cached', async () => {
  const result = await withFetch(
    async () => json({ message: 'boom' }, 500),
    () => callHandler(submission()),
  );
  assert.equal(result.status, 502);
  assert.equal(result.body?.error?.code, 'storage_failed');
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.ok(!result.raw.includes(ENV.key), 'the service-role key leaked into an error response');
});

await check('a rejected credential names the misconfiguration instead of hiding it', async () => {
  const result = await withFetch(
    async () => json({ message: 'no valid api key' }, 401),
    () => callHandler(submission()),
  );
  assert.equal(result.status, 502);
  assert.equal(result.body?.error?.code, 'storage_unauthorized');
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.ok(!result.raw.includes(ENV.key), 'the service-role key leaked into an error response');
});

await check('a network failure is a 502, never an exception', async () => {
  const result = await withFetch(
    async () => {
      throw new Error('ECONNRESET');
    },
    () => callHandler(submission()),
  );
  assert.equal(result.status, 502);
  assert.equal(result.body?.error?.code, 'storage_failed');
});

await check('the endpoint accepts writes only', async () => {
  const result = await callHandler(submission(), { method: 'GET' });
  assert.equal(result.status, 405);
  assert.match(String(result.headers.allow), /POST/);
});

await check('the handler stays free of build-time imports the browser would need', async () => {
  const source = await readFile(new URL('../api/brief.mjs', import.meta.url), 'utf8');
  assert.ok(!/from\s+['"][^'"]*\.ts['"]/.test(source), 'the api handler imports TypeScript');
  assert.ok(!/process\.env\.VITE_/.test(source), 'the api handler reads a browser-exposed variable');
});

if (failures.length) {
  console.error(`check-brief-api: ${failures.length} of ${checks} checks failed`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`check-brief-api: all ${checks} assertions passed`);
