/**
 * The pure half of the individual brief: the answer keys, the limits, body
 * validation and the PostgREST request shape.
 *
 * It lives next to the function instead of inside `src/` because the server
 * bundles it and the browser never does; the underscore keeps Vercel from
 * routing it as its own endpoint. Everything here is synchronous and free of
 * globals, so `scripts/check-brief-api.mjs` can pin it without a database.
 */

/** Every question the form asks, in order. Mirrors `src/brief/questions.ts`. */
export const ANSWER_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'];

/** The table the answers land in. See `supabase/brief.sql`. */
export const TABLE = 'brief_responses';

/** Keep aligned with `MAX_NAME` / `MAX_ANSWER` in `src/brief/questions.ts`. */
export const MAX_NAME = 120;
export const MAX_ANSWER = 5000;

/**
 * A full brief is eight answers of a few paragraphs; 64 KB is generous for that
 * and still refuses a dump before it reaches storage.
 */
export const MAX_BODY = 64 * 1024;

/**
 * The round an answer belongs to. A second edition of the brief must land in a
 * new round, or the synthesis mixes two generations of the collective.
 */
export const DEFAULT_ROUND = 'fundamentos';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Three dot-separated segments of base64url: the shape of a legacy Supabase key. */
const JWT = /^[\w-]+\.[\w-]+\.[\w-]+$/;

/** Names are labels on a table, so run-of whitespace collapses to one space. */
export function normalizeName(value) {
  return typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
}

/**
 * Answers are prose people wrote on purpose: keep their paragraph breaks, drop
 * only trailing spaces and the blank-line runs a textarea leaves behind.
 */
export function normalizeAnswer(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/u, ''))
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}

/** Accepts only a real calendar day written as `YYYY-MM-DD`. */
export function isIsoDate(value) {
  const match = ISO_DATE.exec(String(value));
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

export function isUuid(value) {
  return typeof value === 'string' && UUID.test(value);
}

/**
 * Compares the access code in constant time, so a wrong guess cannot be
 * recovered from response timing. The lengths differ check is not secret: the
 * code length is not the protected value.
 */
export function safeEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (provided.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

function invalid(code, message, fields) {
  return { ok: false, status: 400, code, message, fields };
}

/**
 * Turns a decoded request body into a row, or into the field errors that make
 * the refusal actionable. An unanswered question is allowed on purpose: the
 * brief tells people to say when something is still open. A brief with no
 * answer at all is not a submission.
 */
export function validateSubmission(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return invalid('invalid_body', 'The submission is not a JSON object.');
  }

  const fields = {};

  const nombre = normalizeName(payload.nombre);
  if (!nombre) fields.nombre = 'required';
  else if (nombre.length > MAX_NAME) fields.nombre = 'too_long';

  const fecha = normalizeName(payload.fecha);
  if (!fecha) fields.fecha = 'required';
  else if (!isIsoDate(fecha)) fields.fecha = 'invalid';

  const source = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
  const answers = {};
  let filled = 0;
  for (const key of ANSWER_KEYS) {
    const value = normalizeAnswer(source[key]);
    if (value.length > MAX_ANSWER) fields[key] = 'too_long';
    answers[key] = value;
    if (value.length > 0) filled += 1;
  }
  if (filled === 0) fields.answers = 'required';

  if (Object.keys(fields).length > 0) {
    return invalid('validation_failed', 'Some answers need attention before they can be stored.', fields);
  }
  return { ok: true, row: { nombre, fecha, ...answers } };
}

/** The PostgREST collection URL, or one row of it when an id is given. */
export function restUrl(base, id) {
  const root = String(base).replace(/\/+$/u, '');
  const table = `${root}/rest/v1/${TABLE}`;
  return id === undefined ? table : `${table}?id=eq.${encodeURIComponent(id)}`;
}

/**
 * The service-role key bypasses row level security, so it must never reach the
 * browser: this header set exists only on the server call.
 *
 * Supabase issues two kinds of key. The legacy `service_role` key is a JWT and
 * is accepted both as `apikey` and as a bearer token. A newer `sb_secret_...`
 * key is not a JWT, and PostgREST rejects it as a bearer token with PGRST301,
 * so it travels in `apikey` alone.
 */
export function restHeaders(key) {
  const headers = {
    apikey: key,
    'content-type': 'application/json',
    prefer: 'return=representation',
  };
  if (JWT.test(String(key))) headers.authorization = `Bearer ${key}`;
  return headers;
}

/** `return=representation` answers with an array; tolerate a single object. */
export function storedRow(rows) {
  if (Array.isArray(rows)) return rows[0] ?? undefined;
  if (rows && typeof rows === 'object') return rows;
  return undefined;
}
