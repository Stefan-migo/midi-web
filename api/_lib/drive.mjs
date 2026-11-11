/**
 * The pure half of the live-viewer photo source: normalising a Drive folder
 * link, building the listing request, and mapping Drive files into the shape
 * the viewer renders.
 *
 * It lives next to the function instead of inside `src/` because the server
 * bundles it and the browser never does; the underscore keeps Vercel from
 * routing it as its own endpoint. Everything here is synchronous and free of
 * globals, so `scripts/check-viewer-api.mjs` can pin it without a browser.
 */

const FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
/** Drive ids are long base64url-ish tokens; 20 characters keeps prose out. */
const FOLDER_ID = /^[A-Za-z0-9_-]{20,128}$/;
/** Only stills: a folder that also collects videos must not break the show. */
const IMAGE_FILTER = "mimeType contains 'image/' and trashed=false";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * Accepts the two shapes the owner can paste: the bare folder id, or the share
 * link `https://drive.google.com/drive/folders/<id>?usp=drive_link`.
 * Anything else yields `''` so the caller can answer 400 instead of asking
 * Drive a nonsense question.
 */
export function parseFolderId(value) {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';
  if (FOLDER_ID.test(raw)) return raw;
  const match = raw.match(/\/folders\/([A-Za-z0-9_-]{20,128})/);
  return match ? match[1] : '';
}

/** The Drive listing request for one folder, capped to what a show needs. */
export function listUrl({ folderId, apiKey, limit }) {
  const numeric = Number(limit);
  const pageSize = Number.isFinite(numeric)
    ? Math.min(Math.max(Math.trunc(numeric), 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const url = new URL(FILES_ENDPOINT);
  url.searchParams.set('q', `'${folderId}' in parents and ${IMAGE_FILTER}`);
  url.searchParams.set('fields', 'files(id,name,mimeType,createdTime)');
  url.searchParams.set('orderBy', 'createdTime');
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('key', apiKey);
  return url.toString();
}

/**
 * The thumbnail endpoint, not the file download: Google resizes it, converts
 * HEIC from phones, and serves it from a CDN that does not consume API quota.
 */
export function thumbnailUrl(id, width = 2000) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
}

/** One Drive file into one viewer photo, or `null` when it is not usable. */
export function toPhoto(file) {
  if (!file || typeof file !== 'object') return null;
  const { id, name, createdTime } = file;
  if (typeof id !== 'string' || !id) return null;
  if (typeof createdTime !== 'string') return null;
  const time = Date.parse(createdTime);
  if (!Number.isFinite(time)) return null;
  return {
    id,
    name: typeof name === 'string' && name ? name : `${id}.jpg`,
    createdAt: new Date(time).toISOString(),
    src: thumbnailUrl(id),
  };
}

/**
 * Dedupes by id and orders the show oldest first, so the viewer walks the
 * event in the order it happened and a poll can only append.
 */
export function mergePhotos(previous = [], incoming = []) {
  const byId = new Map();
  for (const photo of [...previous, ...incoming]) {
    if (photo && typeof photo.id === 'string') byId.set(photo.id, photo);
  }
  return [...byId.values()].sort((left, right) => {
    const delta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    if (delta !== 0) return delta;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}
