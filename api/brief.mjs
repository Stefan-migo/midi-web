/**
 * `POST /api/brief` and `PATCH /api/brief` — the storage behind the individual
 * brief, as a Vercel function.
 *
 * Why a function instead of the browser calling Supabase: writing a row needs
 * the service-role key, which bypasses row level security and must never reach
 * a published bundle. The browser sends the answers here; this function checks
 * the access code, validates, and writes with the key that only the server
 * holds.
 *
 * Success: `{ id, submittedAt }`. `201` for a first submission, `200` when an
 * existing answer is updated by the id the browser kept.
 * Errors: `{ error: { code, message, fields? } }` and are never cached.
 *
 * Deploy-time configuration (never `VITE_`-prefixed, so it cannot leak into the
 * browser bundle): `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the name Supabase's
 * Vercel integration injects; the legacy `SUPABASE_SERVICE_ROLE_KEY` is still
 * read as a fallback), `BRIEF_ACCESS_CODE`, and optionally `BRIEF_ROUND` to
 * label a new edition.
 */
import {
  DEFAULT_ROUND,
  MAX_BODY,
  isUuid,
  restHeaders,
  restUrl,
  safeEqual,
  storedRow,
  validateSubmission,
} from './_lib/brief.mjs';

/** A reported failure is a contract: status, code, and no cache. */
function fail(response, status, code, message, extra) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify({ error: { code, message, ...extra } }));
}

function succeed(response, status, id, submittedAt) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify({ id, submittedAt }));
}

function configuration() {
  // Supabase's Vercel integration sets SUPABASE_SECRET_KEY, and its docs point
  // every new deployment at that name. Older setups and most tutorials use the
  // legacy SUPABASE_SERVICE_ROLE_KEY, which the platform deprecates at the end
  // of 2026: both hold the same capable secret, so both keep working, and the
  // current name wins when a deployment carries both.
  const secret = String(process.env.SUPABASE_SECRET_KEY ?? '').trim();
  const legacy = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const settings = {
    url: String(process.env.SUPABASE_URL ?? '').trim(),
    key: secret || legacy,
    accessCode: String(process.env.BRIEF_ACCESS_CODE ?? '').trim(),
    round: String(process.env.BRIEF_ROUND ?? '').trim() || DEFAULT_ROUND,
  };
  // A missing variable is the first thing anyone configuring a deployment gets
  // wrong, and its name is not a secret: naming it turns a 503 into an answer.
  const missing = [];
  if (!settings.url) missing.push('SUPABASE_URL');
  if (!settings.key) missing.push('SUPABASE_SECRET_KEY');
  if (!settings.accessCode) missing.push('BRIEF_ACCESS_CODE');
  return { ...settings, missing };
}

/**
 * Vercel hands a parsed body for `application/json` and the raw string
 * otherwise. Both shapes are accepted, and a body that is neither is refused
 * by validation instead of throwing.
 */
function readPayload(raw) {
  if (typeof raw === 'string') {
    try {
      return { text: raw, payload: JSON.parse(raw) };
    } catch {
      return { text: raw, payload: undefined };
    }
  }
  if (raw && typeof raw === 'object') {
    const text = JSON.stringify(raw);
    return { text, payload: raw };
  }
  return { text: '', payload: undefined };
}

export default async function handler(request, response) {
  const method = String(request?.method ?? 'POST').toUpperCase();
  if (method !== 'POST' && method !== 'PATCH') {
    response.setHeader('allow', 'POST, PATCH');
    fail(response, 405, 'method_not_allowed', 'Only POST and PATCH are supported.');
    return;
  }

  const { text, payload } = readPayload(request?.body);
  const declared = Number(request?.headers?.['content-length'] ?? 0);
  if ((Number.isFinite(declared) && declared > MAX_BODY) || text.length > MAX_BODY) {
    fail(response, 413, 'payload_too_large', `A submission must stay under ${MAX_BODY} bytes.`);
    return;
  }

  const config = configuration();
  if (config.missing.length > 0) {
    fail(response, 503, 'not_configured', 'The brief is not connected to its storage yet.', {
      missing: config.missing,
    });
    return;
  }

  const providedCode = typeof payload?.code === 'string' ? payload.code.trim() : '';
  if (!safeEqual(providedCode, config.accessCode)) {
    fail(response, 401, 'invalid_access_code', 'The access code is not valid.');
    return;
  }

  const validation = validateSubmission(payload);
  if (!validation.ok) {
    fail(response, validation.status, validation.code, validation.message, { fields: validation.fields });
    return;
  }

  const id = method === 'PATCH' ? String(payload?.id ?? '').trim() : '';
  if (method === 'PATCH' && !isUuid(id)) {
    fail(response, 400, 'invalid_id', 'An update needs the id this submission was stored with.');
    return;
  }

  // The id lives in the URL filter for an update; sending it in the payload too
  // would try to rewrite the primary key.
  const row = method === 'POST' ? { ...validation.row, round: config.round } : validation.row;

  let upstream;
  try {
    upstream = await fetch(restUrl(config.url, id || undefined), {
      method,
      headers: restHeaders(config.key),
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    fail(response, 502, 'storage_failed', 'The answers could not be stored. Try again.');
    return;
  }

  if (!upstream.ok) {
    // A rejected key or a policy that is not what the docs describe is a setup
    // problem, and the person configuring the deployment has to see that
    // instead of a generic "could not store".
    if (upstream.status === 401 || upstream.status === 403) {
      fail(
        response,
        502,
        'storage_unauthorized',
        'Storage rejected the configured key. It must be the secret key that bypasses row level security.',
      );
      return;
    }
    if (upstream.status === 429 || upstream.status === 503) {
      fail(response, 503, 'storage_busy', 'Storage is busy right now. Try again in a moment.');
      return;
    }
    fail(response, 502, 'storage_failed', 'The answers could not be stored. Try again.');
    return;
  }

  let rows;
  try {
    rows = await upstream.json();
  } catch {
    rows = undefined;
  }

  const stored = storedRow(rows);
  const storedId = stored && typeof stored.id === 'string' ? stored.id : '';
  if (!storedId) {
    if (method === 'PATCH') {
      fail(response, 404, 'response_not_found', 'That submission is no longer stored. Send it again.');
      return;
    }
    fail(response, 502, 'storage_failed', 'Storage accepted the answers but returned no row.');
    return;
  }

  const submittedAt =
    typeof stored.submitted_at === 'string' ? stored.submitted_at : new Date().toISOString();
  succeed(response, method === 'POST' ? 201 : 200, storedId, submittedAt);
}
