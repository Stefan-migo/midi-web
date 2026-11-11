/**
 * `GET /api/fotos?folder=<id|link>&limit=<n>` — the photo source of the live
 * viewer, as a Vercel function.
 *
 * Why a function instead of the browser calling Drive: the API key stays out of
 * the published bundle, and the CDN cache absorbs a whole crowd. Every viewer
 * asks this endpoint; Vercel answers from cache for 10 seconds, so Drive sees
 * roughly one request per 10 seconds of active traffic instead of one per
 * viewer, which is what keeps the event inside the free quota.
 *
 * Response: `{ folderId, fetchedAt, count, photos[] }`, ordered oldest first.
 * Errors: `{ error: { code, message } }` and are never cached.
 *
 * Deploy-time configuration (never `VITE_`-prefixed, so it cannot leak into the
 * browser bundle): `GOOGLE_DRIVE_API_KEY`, and optionally `DRIVE_FOLDER_ID` as
 * the default folder.
 */
import { listUrl, mergePhotos, parseFolderId, toPhoto } from './_lib/drive.mjs';

/** A reported failure is a contract: status, code, and no cache. */
function fail(response, status, code, message) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify({ error: { code, message } }));
}

export default async function handler(request, response) {
  const method = String(request?.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    response.setHeader('allow', 'GET');
    fail(response, 405, 'method_not_allowed', 'Only GET is supported.');
    return;
  }

  const apiKey = String(process.env.GOOGLE_DRIVE_API_KEY ?? '').trim();
  if (!apiKey) {
    fail(response, 503, 'not_configured', 'No Drive API key is configured for this deployment.');
    return;
  }

  let url;
  try {
    url = new URL(String(request?.url ?? '/'), 'http://localhost');
  } catch {
    fail(response, 400, 'invalid_folder', 'Expected a Drive folder id or a folder link.');
    return;
  }

  const folderId = parseFolderId(url.searchParams.get('folder') ?? process.env.DRIVE_FOLDER_ID ?? '');
  if (!folderId) {
    fail(response, 400, 'invalid_folder', 'Expected a Drive folder id or a folder link.');
    return;
  }

  let upstream;
  try {
    upstream = await fetch(listUrl({ folderId, apiKey, limit: url.searchParams.get('limit') ?? undefined }), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    fail(response, 502, 'upstream_failed', 'Drive could not be reached.');
    return;
  }

  if (upstream.status === 404) {
    fail(response, 404, 'folder_not_found', 'The folder does not exist or is not shared publicly.');
    return;
  }
  if (upstream.status === 403 || upstream.status === 429) {
    fail(response, 503, 'upstream_rate_limited', 'Drive refused or rate-limited the request; retry shortly.');
    return;
  }
  if (!upstream.ok) {
    fail(response, 502, 'upstream_failed', 'Drive answered with an error.');
    return;
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    fail(response, 502, 'upstream_failed', 'Drive answered with unreadable JSON.');
    return;
  }

  const files = Array.isArray(payload?.files) ? payload.files : [];
  const photos = mergePhotos([], files.map(toPhoto).filter(Boolean));

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'public, s-maxage=10, stale-while-revalidate=60');
  response.end(JSON.stringify({ folderId, fetchedAt: new Date().toISOString(), count: photos.length, photos }));
}
