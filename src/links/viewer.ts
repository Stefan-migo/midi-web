/**
 * The live viewer: a full-screen photo show fed by a Google Drive folder.
 *
 * The show reads the folder on a timer, keeps the queue in event order, and
 * walks it — newest first when the page opens, so someone who scans the code
 * mid-event sees what just happened, then looping so the screen is never empty.
 * A poll can only append: photos already shown never move.
 *
 * Everything here is furniture around two decisions that must survive the
 * event: the photos stay in order, and a broken network never blanks the
 * screen — it keeps the last frame and says it is retrying.
 */

import { liveViewer } from '../content/noche-museos';
import {
  fetchPhotos,
  mergePhotos,
  ViewerError,
  type ViewerErrorCode,
  type ViewerPhoto,
} from '../lib/drive';
import { withBase } from '../lib/routes';
import '../styles/viewer.css';

type ViewerStatus = 'loading' | 'live' | 'empty' | 'offline' | 'unconfigured' | 'missing';

const MAX_BACKOFF_MS = 60000;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, label: string, glyph: string): HTMLButtonElement {
  const node = el('button', className, glyph);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.title = label;
  return node;
}

function statusFor(error: unknown): ViewerStatus {
  const code: ViewerErrorCode | '' = error instanceof ViewerError ? error.code : '';
  if (code === 'not_configured') return 'unconfigured';
  if (code === 'folder_not_found' || code === 'invalid_folder') return 'missing';
  return 'offline';
}

function messageFor(status: ViewerStatus): string {
  const { copy } = liveViewer;
  if (status === 'unconfigured') return copy.unconfigured;
  if (status === 'missing') return copy.missing;
  if (status === 'offline') return copy.offline;
  if (status === 'loading') return copy.loading;
  // `live` and `empty` share one sentence: the overlay only shows when there is
  // nothing to display, and then "no photos yet" is the honest state.
  return copy.empty;
}

/** `hace 4 s` / `hace 2 min`, the only clock the page shows. */
function sinceLabel(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  return `hace ${Math.round(seconds / 60)} min`;
}

export function mountViewer(host: HTMLElement): void {
  const { copy } = liveViewer;
  const apiKey = import.meta.env.VITE_DRIVE_API_KEY ?? '';

  const root = el('section', 'midi-viewer');
  root.dataset['status'] = 'loading';
  root.style.setProperty('--viewer-slide-ms', `${liveViewer.slideMs}ms`);
  root.setAttribute('aria-label', liveViewer.title);

  const bar = el('header', 'midi-viewer-bar');
  // The mark is the logo and the way back in one: a visitor who arrives from a
  // shared link gets a brand, and a link home, without a second button.
  const brand = el('a', 'midi-viewer-brand');
  brand.href = withBase(liveViewer.home.href, import.meta.env.BASE_URL);
  brand.setAttribute('aria-label', copy.homeLabel);
  brand.title = liveViewer.home.label;
  const mark = el('img', 'midi-viewer-mark');
  mark.src = withBase('/assets/isotipo-solido-blanco.svg', import.meta.env.BASE_URL);
  mark.alt = '';
  mark.width = 30;
  mark.height = 26;
  mark.decoding = 'async';
  brand.append(mark);
  const kicker = el('p', 'midi-viewer-kicker', liveViewer.kicker);
  const title = el('h1', 'midi-viewer-title', liveViewer.title);
  const status = el('p', 'midi-viewer-status');
  const dot = el('span', 'midi-viewer-dot');
  dot.setAttribute('aria-hidden', 'true');
  const statusText = el('span', 'midi-viewer-status-text', copy.loading);
  status.append(dot, statusText);
  const clock = el('p', 'midi-viewer-clock');
  clock.setAttribute('aria-live', 'off');
  bar.append(brand, kicker, title, status, clock);

  const stage = el('div', 'midi-viewer-stage');
  const layers = [el('img', 'midi-viewer-photo'), el('img', 'midi-viewer-photo')];
  for (const layer of layers) {
    layer.alt = '';
    layer.decoding = 'async';
    layer.dataset['visible'] = 'false';
    stage.append(layer);
  }

  const empty = el('div', 'midi-viewer-empty');
  const emptyMessage = el('p', 'midi-viewer-empty-message', copy.loading);
  const album = el('a', 'midi-viewer-album', copy.album);
  album.href = liveViewer.folderUrl;
  album.target = '_blank';
  album.rel = 'noopener';
  empty.append(emptyMessage, album);
  stage.append(empty);

  const controls = el('footer', 'midi-viewer-controls');
  const prev = button('midi-viewer-button', copy.previous, '←');
  const play = button('midi-viewer-button', copy.pause, '❚❚');
  const next = button('midi-viewer-button', copy.next, '→');
  const count = el('p', 'midi-viewer-count', '0 / 0');
  const fullscreen = button('midi-viewer-button', copy.fullscreen, '⛶');
  controls.append(prev, play, next, count, fullscreen);

  const progress = el('div', 'midi-viewer-progress');
  progress.setAttribute('aria-hidden', 'true');
  const progressFill = el('span', 'midi-viewer-progress-fill');
  progress.append(progressFill);

  root.append(bar, stage, controls, progress);
  host.replaceChildren(root);

  let photos: readonly ViewerPhoto[] = [];
  let broken = new Set<string>();
  let front = 0;
  let currentId = '';
  let playing = true;
  let lastSync = 0;
  let refreshTimer = 0;
  let slideTimer = 0;
  let clockTimer = 0;
  let failures = 0;
  let wakeLock: { released: boolean; release: () => Promise<void> } | null = null;

  const usable = (): readonly ViewerPhoto[] => photos.filter((photo) => !broken.has(photo.id));

  function setStatus(next: ViewerStatus): void {
    root.dataset['status'] = next;
    const live = next === 'live' || next === 'empty';
    statusText.textContent = live ? (playing ? copy.live : copy.paused) : messageFor(next);
    emptyMessage.textContent = messageFor(next);
    empty.hidden = usable().length > 0;
    updateClock();
  }

  function updateClock(): void {
    if (!lastSync) {
      clock.textContent = '';
      return;
    }
    clock.textContent = sinceLabel(Date.now() - lastSync);
  }

  function updateCount(): void {
    const total = usable().length;
    const index = usable().findIndex((photo) => photo.id === currentId);
    count.textContent = total === 0 ? '0 / 0' : `${index === -1 ? 1 : index + 1} / ${total}`;
  }

  function restartProgress(): void {
    progressFill.style.animation = 'none';
    // Reading the layout back is what restarts a finished animation.
    void progressFill.offsetWidth;
    progressFill.style.animation = '';
  }

  function scheduleSlide(): void {
    window.clearTimeout(slideTimer);
    if (!playing) return;
    slideTimer = window.setTimeout(() => advance(1), liveViewer.slideMs);
  }

  async function show(photo: ViewerPhoto): Promise<void> {
    currentId = photo.id;
    empty.hidden = true;
    const back = layers[1 - front] ?? layers[0];
    const outgoing = layers[front] ?? layers[1];
    if (!back || !outgoing) return;

    const reveal = (): void => {
      back.dataset['visible'] = 'true';
      outgoing.dataset['visible'] = 'false';
      front = 1 - front;
      updateCount();
      restartProgress();
      preloadNext();
    };

    back.alt = copy.photoAlt;
    if (back.getAttribute('src') === photo.src && back.complete && back.naturalWidth > 0) {
      reveal();
      return;
    }
    back.onload = reveal;
    back.onerror = (): void => {
      broken = new Set([...broken, photo.id]);
      if (usable().length === 0) setStatus(photos.length ? 'missing' : 'empty');
      advance(1);
    };
    back.src = photo.src;
  }

  function preloadNext(): void {
    const queue = usable();
    if (queue.length < 2) return;
    const index = queue.findIndex((photo) => photo.id === currentId);
    const candidate = queue[(index + 1) % queue.length];
    if (candidate) new Image().src = candidate.src;
  }

  function advance(step: number): void {
    const queue = usable();
    if (queue.length === 0) {
      setStatus(photos.length ? 'missing' : 'empty');
      window.clearTimeout(slideTimer);
      return;
    }
    const index = queue.findIndex((photo) => photo.id === currentId);
    // With nothing on screen yet the show opens on the newest photo: a visitor
    // arriving mid-event wants what just happened, not the first picture.
    const target =
      index === -1 ? queue[queue.length - 1] : queue[(index + step + queue.length) % queue.length];
    if (!target) return;
    void show(target);
    scheduleSlide();
  }

  async function acquireWakeLock(): Promise<void> {
    if (document.hidden || (wakeLock && !wakeLock.released)) return;
    const api = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ released: boolean; release: () => Promise<void> }> };
    };
    if (!api.wakeLock) return;
    try {
      wakeLock = await api.wakeLock.request('screen');
    } catch {
      wakeLock = null;
    }
  }

  function setPlaying(nextValue: boolean): void {
    playing = nextValue;
    play.textContent = playing ? '❚❚' : '▶';
    play.setAttribute('aria-label', playing ? copy.pause : copy.play);
    play.title = playing ? copy.pause : copy.play;
    // A toggle that reports "pressed" while it is playing reads backwards to a
    // screen reader, so the paused state is styling only.
    play.dataset['idle'] = String(!playing);
    progressFill.style.animationPlayState = playing ? 'running' : 'paused';
    if (playing) {
      acquireWakeLock();
      scheduleSlide();
    } else {
      window.clearTimeout(slideTimer);
      void wakeLock?.release().catch(() => undefined);
      wakeLock = null;
    }
    if (root.dataset['status'] === 'live' || root.dataset['status'] === 'empty') {
      statusText.textContent = playing ? copy.live : copy.paused;
    }
  }

  function scheduleRefresh(delay: number): void {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => void refresh(), delay);
  }

  async function refresh(): Promise<void> {
    if (document.hidden) {
      scheduleRefresh(liveViewer.refreshMs);
      return;
    }
    try {
      const incoming = await fetchPhotos({
        source: liveViewer.source,
        folderId: liveViewer.folderId,
        limit: liveViewer.limit,
        apiKey,
      });
      const before = usable().length;
      photos = mergePhotos(photos, incoming);
      failures = 0;
      lastSync = Date.now();
      const after = usable().length;
      setStatus(after === 0 ? 'empty' : 'live');
      updateCount();
      updateClock();
      // The first photos, or the first ones to arrive on an empty screen, start
      // the show; otherwise the timer already owns the next frame.
      if (before === 0 && after > 0) {
        advance(1);
        if (!playing) setPlaying(true);
      }
      scheduleRefresh(liveViewer.refreshMs);
    } catch (error) {
      failures += 1;
      setStatus(statusFor(error));
      scheduleRefresh(Math.min(liveViewer.refreshMs * 2 ** Math.min(failures, 4), MAX_BACKOFF_MS));
    }
  }

  prev.addEventListener('click', () => {
    advance(-1);
    restartProgress();
    scheduleSlide();
  });
  next.addEventListener('click', () => {
    advance(1);
    restartProgress();
    scheduleSlide();
  });
  play.addEventListener('click', () => setPlaying(!playing));
  fullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  });

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      advance(1);
      restartProgress();
      scheduleSlide();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      advance(-1);
      restartProgress();
      scheduleSlide();
    } else if (event.key === ' ') {
      event.preventDefault();
      setPlaying(!playing);
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      fullscreen.click();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearTimeout(slideTimer);
      return;
    }
    if (playing) scheduleSlide();
    acquireWakeLock();
    void refresh();
  });

  // One shared clock for the "hace X" label; nothing else ticks on idle screens.
  clockTimer = window.setInterval(updateClock, 1000);
  window.addEventListener('pagehide', () => {
    window.clearInterval(clockTimer);
    window.clearTimeout(slideTimer);
    window.clearTimeout(refreshTimer);
    void wakeLock?.release().catch(() => undefined);
  });

  setStatus('loading');
  setPlaying(true);
  void refresh();
}
