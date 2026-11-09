import { site } from './content/site';
import type { Scene } from './content/types';
import {
  buildRoutes,
  counterLabel,
  normalizePath,
  routeIndex,
  withBase,
  type RouteSpec,
} from './lib/routes';
import { archiveCards, cardForPiece, lockedPieces, pieceLabel } from './content/portfolio';
import { pieces as pieceTable, silhouetteMasks } from './motion/transition.mjs';
import { placeLabels } from './motion/label-layout.mjs';
import { playBetween, regions, renderPosition, transitionDurationMs } from './motion/site-motion.mjs';

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

const base = import.meta.env.BASE_URL;
const routes: RouteSpec[] = buildRoutes(site);
const scenes: Scene[] = routes.map((route) => route.scene);

const world = must<HTMLElement>('#world');
// ?hover=flip compares against the previous gesture; invert is the default.
world.dataset['hover'] = new URLSearchParams(location.search).get('hover') ?? 'invert';
const composition = must<HTMLElement>('#composition');
const pieces = must<SVGSVGElement>('#pieces');
const hitRegions = must<SVGSVGElement>('#hit-regions');
const art = must<HTMLElement>('#motion-art');
const reveal = must<HTMLElement>('#reveal');
const cards = must<HTMLElement>('#piece-cards');
const revealBody = must<HTMLElement>('#reveal-body');
const titleNode = must<HTMLElement>('#scene-title');
const subtitleNode = must<HTMLElement>('#scene-subtitle');
const advanceButton = must<HTMLButtonElement>('#advance');
const motionButton = must<HTMLButtonElement>('#motion');
const closeButton = must<HTMLButtonElement>('#close');
const coordinateNode = must<HTMLElement>('#coordinate');
const whisperNode = must<HTMLElement>('#whisper');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

// Locked pieces are highlighted by their own silhouette, not by their crop box:
// the box is a partition of the artwork, so filling it would read as a frame.
// These live on the SVG itself because `#pieces` is emptied on every scene change.
const silhouetteDefs = document.createElementNS(pieces.namespaceURI, 'defs');
silhouetteDefs.innerHTML = silhouetteMasks([...lockedPieces]);
hitRegions.prepend(silhouetteDefs);

let sceneIndex = 0;
let position = 0;
let targetPosition = 0;
let selected = 0;
let paused = reduced.matches;
/** Cancels the transition in flight, if any. */
let cancelTransition: (() => void) | undefined;
/** Last moment the transition painted. `0` means nothing is in flight. */
let transitionPaintedAt = 0;
/** A transition that paints nothing for this long is treated as dead. */
const TRANSITION_STALL_MS = 1500;
/** Approximate duration of one single-segment transition, to price a wrap. */
const SEGMENT_MS = 3000;
/** A wrap is one gesture, so it plays compressed instead of scene by scene. */
const WRAP_TOTAL_MS = 2400;

/**
 * A wrap crosses several segments; without compressing it the site would play
 * three seconds per scene to get home.
 */
function transitionTimeScale(from: number, to: number): number {
  const distance = Math.abs(to - from);
  return distance <= 1 ? 1 : WRAP_TOTAL_MS / (distance * SEGMENT_MS);
}
let returnFocus: HTMLElement | undefined;

function currentScene(): Scene {
  const scene = scenes[sceneIndex];
  if (!scene) throw new Error(`No scene at index ${sceneIndex}`);
  return scene;
}

function routeAt(index: number): RouteSpec | undefined {
  return routes[index];
}

function navigate(path: string): void {
  const target = withBase(path, base);
  if (normalizePath(location.pathname, base) === normalizePath(path, '/')) {
    setScene();
    return;
  }
  history.pushState(null, '', target);
  setScene();
}

/**
 * Old links use hash routes. Adopt the hash on first load so a shared
 * `#portafolio` still lands on the real page instead of the home document.
 */
function adoptLegacyHash(): void {
  const legacy = location.hash.replace(/^#/, '');
  if (!legacy) return;
  const id = legacy === 'contacto-final' ? 'exploraciones' : legacy;
  const match = routes.find((route) => route.id === id);
  if (match) history.replaceState(null, '', withBase(match.path, base));
}

function mountPieces(): void {
  pieces.replaceChildren();
  cards.replaceChildren();

  // Cards belong to the archive only. The other scenes reuse the same hit
  // regions for navigation and content, where a flip would be noise.
  const withCards = sceneIndex === 1;
  const cardElements = new Map<string, HTMLElement>();
  if (withCards) {
    for (const definition of archiveCards) {
      const card = document.createElement('div');
      card.className = 'piece-card';
      card.dataset['card'] = definition.id;
      const front = document.createElement('div');
      front.className = 'face face--front';
      const back = document.createElement('div');
      back.className = 'face face--back';
      if (definition.image) {
        const image = document.createElement('img');
        // The source is attached on first hover: a lazy image inside a hidden,
        // rotated face is never considered visible, so it would never load.
        // Root-relative and base-aware, because Vite cannot rewrite a runtime path.
        image.dataset['src'] = withBase(`/${definition.image}`, base);
        image.alt = definition.imageAlt ?? '';
        image.decoding = 'async';
        back.append(image);
      }
      // Without a photo the card is plain paper with ink text; the dark scrim
      // only exists to make white text readable over an image.
      if (definition.image) back.classList.add('has-image');
      const scrim = document.createElement('span');
      scrim.className = 'scrim';
      const text = document.createElement('span');
      text.className = 'card-text';
      const cardTitle = document.createElement('span');
      cardTitle.className = 'card-title';
      cardTitle.textContent = definition.title;
      const cardSubtitle = document.createElement('span');
      cardSubtitle.className = 'card-subtitle';
      cardSubtitle.textContent = definition.subtitle;
      text.append(cardTitle, cardSubtitle);
      if (definition.image) back.append(scrim);
      back.append(text);
      card.append(front, back);
      cards.append(card);
      cardElements.set(definition.id, card);
    }
  }

  // One card covers several pieces, so a counter keeps it flipped while the
  // pointer travels between the pieces of the same group.
  const openCount = new Map<string, number>();
  // A card can span several pieces. Lighting the whole group is what makes it
  // read as one work instead of loose blocks reacting separately.
  const groupsByCard = new Map<string, SVGGElement[]>();
  const revealCard = (id: string): void => {
    const card = cardElements.get(id);
    if (!card) return;
    const next = (openCount.get(id) ?? 0) + 1;
    openCount.set(id, next);
    if (next > 1) return;
    const image = card.querySelector('img');
    const source = image?.dataset['src'];
    if (image && source) {
      image.src = source;
      delete image.dataset['src'];
    }
    card.classList.add('is-flipped');
    for (const group of groupsByCard.get(id) ?? []) group.classList.add('is-active');
  };
  const concealCard = (id: string): void => {
    const card = cardElements.get(id);
    if (!card) return;
    const next = Math.max(0, (openCount.get(id) ?? 1) - 1);
    openCount.set(id, next);
    if (next > 0) return;
    card.classList.remove('is-flipped');
    for (const group of groupsByCard.get(id) ?? []) group.classList.remove('is-active');
  };

  const boxes = (regions[targetPosition] ?? []) as Box[];
  boxes.forEach(([x, y, right, bottom], index) => {
    // The name comes from the motion engine's own piece table, so the component
    // and the artwork share one key instead of two parallel lists.
    const name = pieceTable[index]?.name ?? `piece-${index}`;
    // Locking and cards are archive-only: the other scenes use the same pieces
    // for navigation, where the hero highlight already has its own behaviour.
    const locked = sceneIndex === 1 && lockedPieces.has(name);
    const definition = sceneIndex === 1 && !locked ? cardForPiece(name) : undefined;

    // The hit boxes are crop boxes, not tight outlines of the visible shape, so a
    // fixed 12px rim and a 3% growth are fine on the thick blocks of the M and far
    // too much on a thin bar. The group class decides how loud the highlight is.
    const single = definition !== undefined && definition.pieces.length === 1;
    const classes = ['piece-group'];
    if (locked) classes.push('is-locked');
    else if (single) classes.push('is-single');
    const group = document.createElementNS(pieces.namespaceURI, 'g') as SVGGElement;
    group.setAttribute('class', classes.join(' '));
    group.setAttribute('data-piece', name);
    if (definition) {
      const members = groupsByCard.get(definition.id) ?? [];
      members.push(group);
      groupsByCard.set(definition.id, members);
    }

    // Visual layer: invisible at rest, so the resting artwork is never touched.
    const geometry = document.createElementNS(pieces.namespaceURI, 'rect') as SVGRectElement;
    geometry.setAttribute('class', 'geometry');
    geometry.setAttribute('pointer-events', 'none');

    const piece = document.createElementNS(pieces.namespaceURI, 'rect') as SVGRectElement;
    piece.setAttribute('class', 'hit');
    piece.setAttribute('role', 'button');
    piece.setAttribute('tabindex', '0');
    const targetLabel = sceneIndex === 0 ? routes[1]?.scene.navLabel : routes[sceneIndex]?.scene.navLabel;
    piece.setAttribute(
      'aria-label',
      sceneIndex === 0
        ? `Abrir ${targetLabel ?? 'contenido'}, fragmento ${index + 1}`
        : definition
          ? `${definition.title}. Abrir la obra`
          : pieceLabel(name),
    );

    const attributes = { x, y, width: right - x, height: bottom - y };
    for (const [key, value] of Object.entries(attributes)) {
      piece.setAttribute(key, String(value));
      geometry.setAttribute(key, String(value));
    }
    if (locked) geometry.setAttribute('mask', `url(#silhouette-${name})`);

    const activate = (): void => {
      const target = routeAt(sceneIndex === 0 ? 1 : sceneIndex);
      if (sceneIndex === 0) {
        if (target) navigate(target.path);
      } else if (definition) {
        openContent(index);
      }
    };
    const showLabel = (): void => {
      whisperNode.textContent = definition?.title ?? pieceLabel(name);
      if (definition) revealCard(definition.id);
    };
    const clearLabel = (): void => {
      whisperNode.textContent = site.hint ?? '';
      if (definition) concealCard(definition.id);
    };
    piece.addEventListener('pointerenter', showLabel);
    piece.addEventListener('pointerleave', clearLabel);
    piece.addEventListener('focus', showLabel);
    piece.addEventListener('blur', clearLabel);
    piece.addEventListener('click', activate);
    piece.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
    group.append(geometry, piece);
    pieces.append(group);
  });
  layoutCards();
}

/**
 * Anchors each card to the union of the pieces it covers: a card over two legs
 * is one box spanning both, not two overlapping cards. Thin groups would give
 * an unreadable card, so it gets a floor and is centred on its group.
 */
function layoutCards(): void {
  const origin = composition.getBoundingClientRect();
  for (const definition of archiveCards) {
    const card = cards.querySelector<HTMLElement>(`[data-card="${definition.id}"]`);
    if (!card) continue;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const name of definition.pieces) {
      const hit = pieces.querySelector<SVGRectElement>(`.piece-group[data-piece="${name}"] .hit`);
      if (!hit) continue;
      const rect = hit.getBoundingClientRect();
      left = Math.min(left, rect.left);
      top = Math.min(top, rect.top);
      right = Math.max(right, rect.right);
      bottom = Math.max(bottom, rect.bottom);
    }
    if (!Number.isFinite(left)) continue;
    const rawWidth = right - left;
    const rawHeight = bottom - top;
    // Six pixels of air so the card covers the highlight behind it instead of
    // leaving a stray rim around the edge.
    const width = Math.max(rawWidth, 132) + 6;
    const height = Math.max(rawHeight, 104) + 6;
    const x = left - origin.left + (rawWidth - width) / 2;
    const y = top - origin.top + (rawHeight - height) / 2;
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    // Wide groups turn around the horizontal axis, tall ones around the vertical.
    card.classList.toggle('is-horizontal', rawWidth > rawHeight);
    // Against the bottom edge the text would be clipped, so it moves to the top.
    card.classList.toggle('is-text-top', y + height > origin.height - 6);
  }
}
function setScene(animate = true): void {
  targetPosition = routeIndex(location.pathname, routes, base);
  sceneIndex = targetPosition;
  closeContent();
  cancelTransition?.();
  world.dataset['scene'] = String(sceneIndex);
  const data = currentScene();
  titleNode.textContent = data.title;
  subtitleNode.textContent = data.subtitle;
  advanceButton.innerHTML = counterLabel(sceneIndex, routes.length);
  document.querySelectorAll('.scene-map a').forEach((link, index) => {
    if (index === sceneIndex) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const shouldAnimate = animate && !paused && !reduced.matches && position !== targetPosition;
  // The labels and the artwork must start and finish together, so the label
  // transition duration is derived from the same number the animation uses.
  const labelScale = transitionTimeScale(position, targetPosition);
  world.style.setProperty(
    '--label-ms',
    `${Math.round(transitionDurationMs(position, targetPosition, labelScale))}ms`,
  );
  placeLabels(sceneIndex, shouldAnimate);
  if (!shouldAnimate) {
    showFrame(targetPosition);
    mountPieces();
    cancelTransition = undefined;
    transitionPaintedAt = 0;
    return;
  }
  pieces.replaceChildren();
  startTransition();
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
  for (const sibling of [...world.children]) {
    if (sibling !== reveal) (sibling as HTMLElement).inert = true;
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
  if (wasOpen) {
    for (const sibling of [...world.children]) {
      if (sibling !== reveal) (sibling as HTMLElement).inert = false;
    }
  }
  if (wasOpen && returnFocus) returnFocus.focus();
}

closeButton.onclick = closeContent;

/**
 * Runs the transition to `targetPosition`. One place owns the in-flight state,
 * completion is idempotent, and a transition that stops painting is treated as
 * dead instead of blocking navigation forever.
 */
function startTransition(): void {
  cancelTransition?.();
  cancelTransition = undefined;
  let settled = false;
  transitionPaintedAt = performance.now();
  const settle = (): void => {
    if (settled) return;
    settled = true;
    cancelTransition = undefined;
    transitionPaintedAt = 0;
    mountPieces();
  };
  const handle = playBetween(
    position,
    targetPosition,
    (next: number) => {
      if (settled) return;
      transitionPaintedAt = performance.now();
      showFrame(next);
    },
    settle,
    transitionTimeScale(position, targetPosition),
  );
  // A transition that settles synchronously must not leave a handle behind.
  cancelTransition = settled ? undefined : handle;
}

/** Recovery for a transition that stopped painting: navigation must not die. */
function clearStalledTransition(): void {
  if (transitionPaintedAt === 0) return;
  if (performance.now() - transitionPaintedAt < TRANSITION_STALL_MS) return;
  cancelTransition?.();
  cancelTransition = undefined;
  transitionPaintedAt = 0;
  position = targetPosition;
  showFrame(position);
  mountPieces();
}

function advance(direction: number): void {
  if (!reveal.hidden) return;
  clearStalledTransition();
  const next = targetPosition + direction;
  if (next < 0 || next >= routes.length) {
    const wrapped = routes[(next + routes.length) % routes.length];
    if (wrapped) navigate(wrapped.path);
    return;
  }
  const target = routeAt(next);
  if (target) navigate(target.path);
}

advanceButton.onclick = () => advance(1);

function syncMotionButton(): void {
  motionButton.textContent = paused ? '▷' : 'Ⅱ';
  motionButton.setAttribute('aria-label', paused ? 'Activar movimiento' : 'Pausar movimiento');
}

motionButton.onclick = () => {
  paused = !paused;
  syncMotionButton();
  if (paused) setScene(false);
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

/**
 * Internal navigation is intercepted so the scene transition survives a page
 * change. The document is a real URL either way: without JavaScript, the link
 * loads the prerendered page.
 */
document.addEventListener('click', (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.target && anchor.target !== '_self') return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return;
  const path = normalizePath(url.pathname, base);
  const match = routes.find((route) => normalizePath(route.path, '/') === path);
  if (!match) return;
  event.preventDefault();
  navigate(match.path);
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
  if (paused) setScene(false);
});

addEventListener('popstate', () => setScene());
addEventListener('resize', () => {
  placeLabels(sceneIndex);
  layoutCards();
});

document.fonts.ready.then(() => {
  if (!cancelTransition) placeLabels(sceneIndex);
});

if (site.hint) whisperNode.textContent = site.hint;
adoptLegacyHash();
syncMotionButton();
setScene(false);
