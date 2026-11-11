/**
 * The client half of the live photo source: one call that returns the photos of
 * a Drive folder as the viewer wants them, whichever side of the proxy it is
 * talking to.
 *
 * Both transports answer with the same list contract, so the direction of the
 * show does not change when `source` flips from `api` to `drive`.
 */

import { withBase } from './routes';

export interface ViewerPhoto {
  readonly id: string;
  readonly name: string;
  /** ISO timestamp used to order the show. */
  readonly createdAt: string;
  readonly src: string;
}

export type ViewerErrorCode =
  | 'not_configured'
  | 'invalid_folder'
  | 'folder_not_found'
  | 'upstream_rate_limited'
  | 'upstream_failed'
  | 'network';

const KNOWN_CODES: readonly ViewerErrorCode[] = [
  'not_configured',
  'invalid_folder',
  'folder_not_found',
  'upstream_rate_limited',
  'upstream_failed',
];

/** A failure the page can describe, instead of a bare `fetch` rejection. */
export class ViewerError extends Error {
  readonly code: ViewerErrorCode;

  constructor(code: ViewerErrorCode, message: string) {
    super(message);
    this.name = 'ViewerError';
    this.code = code;
  }
}

export interface SourceConfig {
  readonly source: 'api' | 'drive';
  readonly folderId: string;
  readonly limit: number;
  /** Only `drive` needs it: the browser asks Google itself. */
  readonly apiKey?: string;
  readonly timeoutMs?: number;
}

const THUMBNAIL_WIDTH = 2000;
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DEFAULT_TIMEOUT_MS = 9000;

/**
 * Google's own thumbnail service, not the file download: it resizes, it
 * converts the HEIC that phones upload, and it does not consume API quota.
 */
export function thumbnailUrl(id: string, width = THUMBNAIL_WIDTH): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${width}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** One file from either transport into one photo, or `null` if unusable. */
export function toPhoto(value: unknown): ViewerPhoto | null {
  const file = asRecord(value);
  if (!file) return null;
  const id = typeof file['id'] === 'string' ? file['id'] : '';
  if (!id) return null;
  const raw = typeof file['createdAt'] === 'string' ? file['createdAt'] : file['createdTime'];
  const created = typeof raw === 'string' ? Date.parse(raw) : Number.NaN;
  if (!Number.isFinite(created)) return null;
  const src = typeof file['src'] === 'string' && file['src'] ? file['src'] : thumbnailUrl(id);
  const name = typeof file['name'] === 'string' && file['name'] ? file['name'] : `${id}.jpg`;
  return { id, name, createdAt: new Date(created).toISOString(), src };
}

/**
 * Dedupes by id and orders the show oldest first, so a poll can only append and
 * a photo never plays twice.
 */
export function mergePhotos(
  previous: readonly ViewerPhoto[],
  incoming: readonly ViewerPhoto[],
): ViewerPhoto[] {
  const byId = new Map<string, ViewerPhoto>();
  for (const photo of [...previous, ...incoming]) byId.set(photo.id, photo);
  return [...byId.values()].sort((left, right) => {
    const delta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    if (delta !== 0) return delta;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

function listingUrl(config: SourceConfig): string {
  if (config.source === 'api') {
    const query = new URLSearchParams({ folder: config.folderId, limit: String(config.limit) });
    return `${withBase('/api/fotos', import.meta.env.BASE_URL)}?${query.toString()}`;
  }
  const apiKey = config.apiKey ?? '';
  if (!apiKey) return '';
  const url = new URL(DRIVE_FILES_URL);
  url.searchParams.set('q', `'${config.folderId}' in parents and mimeType contains 'image/' and trashed=false`);
  url.searchParams.set('fields', 'files(id,name,mimeType,createdTime)');
  url.searchParams.set('orderBy', 'createdTime');
  url.searchParams.set('pageSize', String(Math.min(Math.max(config.limit, 1), 200)));
  url.searchParams.set('key', apiKey);
  return url.toString();
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(ms)
    : undefined;
}

/** Reads the folder once. Throws `ViewerError` for anything the page can show. */
export async function fetchPhotos(config: SourceConfig): Promise<readonly ViewerPhoto[]> {
  const url = listingUrl(config);
  if (!url) throw new ViewerError('not_configured', 'The viewer has no Drive key for direct reads.');

  let response: Response;
  try {
    const signal = timeoutSignal(config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    response = await fetch(url, signal ? { headers: { accept: 'application/json' }, signal } : { headers: { accept: 'application/json' } });
  } catch {
    throw new ViewerError('network', 'The photo source could not be reached.');
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const body = asRecord(payload);
  // A 200 that is not our JSON means something else answered: the function is
  // missing, or a dev server returned the shell. That is a failure, not an
  // empty album.
  if (!body) throw new ViewerError('upstream_failed', 'The photo source answered with something unreadable.');

  if (!response.ok) {
    const error = asRecord(body?.['error']);
    const raw = typeof error?.['code'] === 'string' ? error['code'] : '';
    const code = (KNOWN_CODES as readonly string[]).includes(raw)
      ? (raw as ViewerErrorCode)
      : response.status === 404
        ? 'folder_not_found'
        : 'upstream_failed';
    throw new ViewerError(code, typeof error?.['message'] === 'string' ? error['message'] : 'The photo source failed.');
  }

  // The proxy answers with `photos`; a direct Drive read answers with `files`.
  const list = Array.isArray(body?.['photos'])
    ? (body['photos'] as readonly unknown[])
    : Array.isArray(body?.['files'])
      ? (body['files'] as readonly unknown[])
      : [];
  return list.map(toPhoto).filter((photo): photo is ViewerPhoto => photo !== null);
}
