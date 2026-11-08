import { site } from './content/site';
import type { Scene } from './content/types';
import { placeLabels } from './motion/label-layout.mjs';
import { playBetween, regions, renderPosition } from './motion/site-motion.mjs';

/**
 * Per-scene hit boxes as produced by `site-motion.mjs`: `[left, top, right, bottom]`
 * in the composition coordinate space.
 */
type Box = readonly [number, number, number, number];

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

const world = must<HTMLElement>('#world');
const composition = must<HTMLElement>('#composition');
const pieces = must<SVGSVGElement>('#pieces');
const art = must<HTMLElement>('#motion-art');
const reveal = must<HTMLElement>('#reveal');
const revealBody = must<HTMLElement>('#reveal-body');
const titleNode = must<HTMLElement>('#scene-title');
const subtitleNode = must<HTMLElement>('#scene-subtitle');
const advanceButton = must<HTMLButtonElement>('#advance');
const motionButton = must<HTMLButtonElement>('#motion');
const closeButton = must<HTMLButtonElement>('#close');
const coordinateNode = must<HTMLElement>('#coordinate');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const scenes: Scene[] = [...site.scenes].sort((a, b) => a.order - b.order);
const routes: string[] = scenes.map((scene) => scene.id);

let sceneIndex = 0;
let position = 0;
let targetPosition = 0;
let selected = 0;
let paused = reduced.matches;
let stopPlayback: (() => void) | undefined;
let returnFocus: HTMLElement | undefined;

function currentScene(): Scene {
  const scene = scenes[sceneIndex];
  if (!scene) throw new Error(`No scene at index ${sceneIndex}`);
  return scene;
}

function routeAt(index: number): string {
  return routes[index] ?? routes[0] ?? '';
}

function mountPieces(): void {
  pieces.replaceChildren();
  const boxes = (regions[targetPosition] ?? []) as Box[];
  boxes.forEach(([x, y, right, bottom], index) => {
    const piece = document.createElementNS(pieces.namespaceURI, 'rect') as SVGRectElement;
    piece.setAttribute('class', 'piece');
    piece.setAttribute('role', 'button');
    piece.setAttribute('tabindex', '0');
    piece.setAttribute(
      'aria-label',
      sceneIndex === 0
        ? `Desplegar universo MIDI, fragmento ${index + 1}`
        : `Abrir ${routeAt(sceneIndex)}, fragmento ${index + 1}`,
    );
    const attributes = { x, y, width: right - x, height: bottom - y };
    for (const [key, value] of Object.entries(attributes)) {
      piece.setAttribute(key, String(value));
    }
    const activate = (): void => {
      if (sceneIndex === 0) go(1);
      else openContent(index);
    };
    piece.addEventListener('click', activate);
    piece.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
    pieces.append(piece);
  });
}

function go(index: number): void {
  location.hash = routeAt(index);
}

function setScene(animate = true): void {
  const requested = location.hash.slice(1);
  const route = requested === 'contacto-final' ? 'exploraciones' : requested;
  targetPosition = Math.max(0, routes.indexOf(route));
  sceneIndex = targetPosition;
  closeContent();
  stopPlayback?.();
  world.dataset['scene'] = String(sceneIndex);
  const data = currentScene();
  titleNode.textContent = data.title;
  subtitleNode.textContent = data.subtitle;
  advanceButton.innerHTML = `0${sceneIndex} / 04 <span>↗</span>`;
  document.querySelectorAll('.scene-map a').forEach((link, index) => {
    if (index === sceneIndex) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const shouldAnimate = animate && !paused && !reduced.matches && position !== targetPosition;
  placeLabels(sceneIndex, shouldAnimate);
  if (!shouldAnimate) {
    showFrame(targetPosition);
    mountPieces();
    stopPlayback = undefined;
    return;
  }
  pieces.replaceChildren();
  stopPlayback = playBetween(position, targetPosition, showFrame, () => {
    stopPlayback = undefined;
    mountPieces();
  });
}

function showFrame(next: number): void {
  position = next;
  art.innerHTML = renderPosition(next);
}

function openContent(index: number): void {
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  selected = index % 4;
  const data = currentScene();
  if (data.gallery?.length) {
    const item = data.gallery[selected % data.gallery.length];
    if (!item) return;
    revealBody.innerHTML =
      `<h2 id="reveal-title">${item.title ?? data.body?.heading ?? data.title}</h2>` +
      `<img id="art" src="${item.src}" alt="${item.alt}">` +
      '<div class="work-switch">' +
      '<button id="previous" aria-label="Pieza anterior">←</button>' +
      '<button id="next" aria-label="Pieza siguiente">→</button>' +
      '</div>';
    const previous = revealBody.querySelector<HTMLButtonElement>('#previous');
    const next = revealBody.querySelector<HTMLButtonElement>('#next');
    if (previous) previous.onclick = () => changeArt(-1);
    if (next) next.onclick = () => changeArt(1);
  } else if (data.body) {
    const paragraphs = data.body.paragraphs.map((text) => `<p>${text}</p>`).join('');
    const links = (data.body.links ?? [])
      .map((link) => `<a href="${link.href}">${link.label} ↗</a>`)
      .join('');
    revealBody.innerHTML = `<h2 id="reveal-title">${data.body.heading}</h2>${paragraphs}${links}`;
  } else {
    revealBody.innerHTML = `<h2 id="reveal-title">${data.title}</h2>`;
  }
  reveal.hidden = false;
  reveal.setAttribute('role', 'dialog');
  reveal.setAttribute('aria-modal', 'true');
  closeButton.focus();
}

function changeArt(step: number): void {
  const gallery = currentScene().gallery ?? [];
  if (!gallery.length) return;
  selected = (selected + step + gallery.length) % gallery.length;
  const item = gallery[selected];
  if (!item) return;
  const image = revealBody.querySelector<HTMLImageElement>('#art');
  const heading = revealBody.querySelector<HTMLElement>('#reveal-title');
  if (image) {
    image.src = item.src;
    image.alt = item.alt;
  }
  if (heading) {
    heading.textContent = item.title ?? currentScene().body?.heading ?? currentScene().title;
  }
}

function closeContent(): void {
  const wasOpen = !reveal.hidden;
  reveal.hidden = true;
  if (wasOpen && returnFocus) returnFocus.focus();
}

closeButton.onclick = closeContent;

function advance(direction: number): void {
  if (stopPlayback || !reveal.hidden) return;
  const next = targetPosition + direction;
  if (next < 0 || next >= routes.length) {
    location.hash = routeAt((next + routes.length) % routes.length);
    setScene(false);
  } else {
    go(next);
  }
}

advanceButton.onclick = () => advance(1);

function syncMotionButton(): void {
  motionButton.textContent = paused ? '▷' : 'Ⅱ';
  motionButton.setAttribute('aria-label', paused ? 'Activar movimiento' : 'Pausar movimiento');
}

motionButton.onclick = () => {
  paused = !paused;
  syncMotionButton();
  if (paused && stopPlayback) setScene(false);
};

world.addEventListener('pointermove', (event) => {
  coordinateNode.textContent = `${String(Math.round(event.clientX)).padStart(3, '0')} : ${String(
    Math.round(event.clientY),
  ).padStart(3, '0')}`;
});

let lastWheel = -Infinity;
world.addEventListener(
  'wheel',
  (event) => {
    if (!reveal.hidden || Math.abs(event.deltaY) < 20) return;
    event.preventDefault();
    const now = performance.now();
    const isNewGesture = now - lastWheel > 180;
    lastWheel = now;
    if (isNewGesture) advance(Math.sign(event.deltaY));
  },
  { passive: false },
);

let touchOrigin: number | undefined;
composition.addEventListener(
  'touchstart',
  (event) => {
    const touch = event.touches[0];
    if (event.touches.length === 1 && touch) touchOrigin = touch.clientY;
  },
  { passive: true },
);
composition.addEventListener(
  'touchend',
  (event) => {
    const touch = event.changedTouches[0];
    if (touchOrigin === undefined || !touch) return;
    const distance = touchOrigin - touch.clientY;
    touchOrigin = undefined;
    if (Math.abs(distance) > 55) advance(Math.sign(distance));
  },
  { passive: true },
);
composition.addEventListener('touchcancel', () => {
  touchOrigin = undefined;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeContent();
  if (!reveal.hidden && event.key === 'Tab') {
    const focusable = [...reveal.querySelectorAll<HTMLElement>('button,a')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

reduced.addEventListener('change', () => {
  paused = reduced.matches;
  syncMotionButton();
  if (paused && stopPlayback) setScene(false);
});

addEventListener('hashchange', () => setScene());
addEventListener('resize', () => placeLabels(sceneIndex));

document.fonts.ready.then(() => {
  if (!stopPlayback) placeLabels(sceneIndex);
});

syncMotionButton();
setScene(false);
