import { site } from './content/site';
import { aboutScenes } from './content/about';
import { midiHub } from './content/midi-links';
import type { Scene } from './content/types';
import {
  buildRoutes,
  normalizePath,
  routeIndex,
  withBase,
  type RouteSpec,
} from './lib/routes';
import { archiveCards, cardForPiece, isLockedPiece, lockedPieces, pieceLabel, type ArchiveCard } from './content/portfolio';
import { renderMidiHub } from './links/hub';
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
// The panel takes the focus when it opens, not the close button: a programmatic
// focus on the × paints its focus ring before anyone has touched the keyboard,
// and a dialog focus is what scrolls a screen reader to the panel's own title.
reveal.tabIndex = -1;
const cards = must<HTMLElement>('#piece-cards');
const revealBody = must<HTMLElement>('#reveal-body');
const titleNode = must<HTMLElement>('#scene-title');
const subtitleNode = must<HTMLElement>('#scene-subtitle');
const closeButton = must<HTMLButtonElement>('#close');
const whisperNode = must<HTMLElement>('#whisper');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const narrowViewport = matchMedia('(max-width: 650px)');
/** A touch that travels further than this in either axis is a swipe, not a tap. */
const TOUCH_SLOP_PX = 12;
/** The `click` synthesized by a tap arrives well inside this window. */
const TOUCH_CLICK_WINDOW_MS = 700;
/** A click right after opening is the tail of the opening gesture, not a dismissal. */
const OUTSIDE_CLICK_GRACE_MS = 350;
let panelOpenedAt = -Infinity;

// Locked pieces are highlighted by their own silhouette, not by their crop box:
// the box is a partition of the artwork, so filling it would read as a frame.
// These live on the SVG itself because `#pieces` is emptied on every scene change.
const silhouetteDefs = document.createElementNS(pieces.namespaceURI, 'defs');
silhouetteDefs.innerHTML = silhouetteMasks(
  [...lockedPieces].filter((name) => isLockedPiece(name, narrowViewport.matches)),
);
hitRegions.prepend(silhouetteDefs);

let sceneIndex = 0;
let position = 0;
let targetPosition = 0;
let selected = 0;
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
let returnFocus: HTMLElement | SVGElement | undefined;
let aboutPanelOpen = false;
let aboutSceneIndex = 0;
let archiveSourceRect: DOMRect | undefined;
let archiveFrameEdges: HTMLDivElement[] = [];
let archiveAnimationRun = 0;

const ARCHIVE_EDGE_DURATION_MS = 500;
const ARCHIVE_EDGE_STAGGER_MS = 40;
const ARCHIVE_BODY_DELAY_MS = 340;
const ARCHIVE_CONTENT_DELAY_MS = 520;
const ARCHIVE_CLOSE_DURATION_MS = 220;
const ARCHIVE_EASE = 'cubic-bezier(.16, 1, .3, 1)';

function makeFrameEdge(box: { left: number; top: number; width: number; height: number }): HTMLDivElement {
  const edge = document.createElement('div');
  edge.className = 'archive-frame-edge';
  Object.assign(edge.style, boxFrames(box));
  return edge;
}

/** A box as the px strings WAAPI needs to animate those four properties. */
function boxFrames(box: { left: number; top: number; width: number; height: number }) {
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  };
}

/**
 * The four slices land on the panel's own 2px paper outline. The panel already
 * carries the 10px ink border the identity asks for, so the gap is zero here and
 * the frame tracks the panel box, never its 5% padding.
 */
const ARCHIVE_FRAME_GAP_PX = 0;

function archiveFrameBoxes(paper: DOMRect): Array<{ left: number; top: number; width: number; height: number }> {
  const gap = ARCHIVE_FRAME_GAP_PX;
  const left = paper.left - gap;
  const top = paper.top - gap;
  const width = paper.width + gap * 2;
  const height = paper.height + gap * 2;
  return [
    { left: left - 2, top: top - 2, width: width + 4, height: 2 },
    { left: left - 2, top: top + height, width: width + 4, height: 2 },
    { left: left - 2, top, width: 2, height },
    { left: left + width, top, width: 2, height },
  ];
}

function clearArchiveEdges(): void {
  for (const edge of archiveFrameEdges) {
    edge.getAnimations().forEach((animation) => animation.cancel());
    edge.remove();
  }
  archiveFrameEdges = [];
}

function animateArchiveOpen(source: DOMRect): void {
  archiveSourceRect = source;
  reveal.classList.add('archive-motion');
  if (reduced.matches) {
    reveal.classList.add('archive-reduced');
    return;
  }

  const frame = archiveFrameBoxes(reveal.getBoundingClientRect());
  const sliceWidth = source.width / 4;
  const run = ++archiveAnimationRun;
  clearArchiveEdges();
  const flights = frame.map((target, index) => {
    const origin = {
      left: source.left + index * sliceWidth,
      top: source.top,
      width: sliceWidth,
      height: source.height,
    };
    const edge = makeFrameEdge(origin);
    document.body.append(edge);
    archiveFrameEdges.push(edge);
    return edge
      .animate([boxFrames(origin), boxFrames(target)], {
        duration: ARCHIVE_EDGE_DURATION_MS,
        delay: index * ARCHIVE_EDGE_STAGGER_MS,
        easing: ARCHIVE_EASE,
        fill: 'forwards',
      })
      .finished.catch(() => undefined);
  });

  // Once the hairline has landed the panel's own outline carries it, so the bars
  // go away instead of drifting the first time the viewport is resized.
  void Promise.all(flights).then(() => {
    if (run === archiveAnimationRun) clearArchiveEdges();
  });

  requestAnimationFrame(() => {
    if (run === archiveAnimationRun) reveal.classList.add('archive-opening');
  });
}

function finishArchiveClose(): void {
  ++archiveAnimationRun;
  clearArchiveEdges();
  archiveSourceRect = undefined;
  reveal.classList.remove('archive-motion', 'archive-opening', 'archive-closing', 'archive-reduced');
  reveal.hidden = true;
  reveal.setAttribute('aria-hidden', 'true');
  for (const sibling of [...world.children]) {
    if (sibling !== reveal) (sibling as HTMLElement).inert = false;
  }
  if (returnFocus) returnFocus.focus();
  returnFocus = undefined;
}

function animateArchiveClose(): boolean {
  if (!reveal.classList.contains('archive-motion')) return false;
  const run = ++archiveAnimationRun;
  reveal.classList.remove('archive-opening');
  reveal.classList.add('archive-closing');
  // The panel shuts like a projector shutter; the slices already became the
  // hairline on the way in, so nothing has to fly back.
  window.setTimeout(() => {
    if (run === archiveAnimationRun) finishArchiveClose();
  }, reduced.matches ? 0 : ARCHIVE_CLOSE_DURATION_MS);
  return true;
}

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
      cardTitle.textContent = definition.name;
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
    const locked = sceneIndex === 1 && isLockedPiece(name, narrowViewport.matches);
    const definition = sceneIndex === 1 && !locked ? cardForPiece(name, narrowViewport.matches) : undefined;

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
    // The contact scene has one panel behind all of its blocks: the link hub.
    const contactBlock = sceneIndex === 3;
    piece.setAttribute(
      'aria-label',
      sceneIndex === 0
        ? `Abrir ${targetLabel ?? 'contenido'}, fragmento ${index + 1}`
        : definition
          ? `${definition.name}. Abrir la obra`
          : contactBlock
            ? `${targetLabel ?? 'Contacto'}. Abrir los enlaces`
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
      } else if (sceneIndex === 2) {
        openContent(index, undefined, piece, 'about');
      } else if (definition) {
        openContent(index, definition, piece);
      } else if (contactBlock) {
        openContent(index, undefined, piece, 'contact');
      }
    };
    const showLabel = (): void => {
      holdHint(definition?.name ?? (contactBlock ? 'Abrir los enlaces' : pieceLabel(name, narrowViewport.matches)));
      if (definition && !(narrowViewport.matches && name === 'solid-dot')) revealCard(definition.id);
    };
    const clearLabel = (): void => {
      releaseHint();
      if (definition && !(narrowViewport.matches && name === 'solid-dot')) concealCard(definition.id);
    };
    piece.addEventListener('pointerenter', showLabel);
    piece.addEventListener('pointerleave', clearLabel);
    piece.addEventListener('focus', showLabel);
    piece.addEventListener('blur', clearLabel);
    // A touch browser can spend the first tap on the hover state of a styled
    // block and turn only the second tap into a `click`. The HUD promises one
    // touch ("tocá una forma"), so a touch activates on its own release, within a
    // movement budget that keeps a swipe from opening anything. The `click`
    // synthesized by that same gesture is then ignored, so nothing opens twice.
    let touchOrigin: { id: number; x: number; y: number } | undefined;
    let touchActivatedAt = -Infinity;
    piece.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      touchOrigin = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    piece.addEventListener('pointercancel', () => {
      touchOrigin = undefined;
    });
    piece.addEventListener('pointerup', (event) => {
      if (event.pointerType === 'mouse' || touchOrigin?.id !== event.pointerId) return;
      const moved = Math.hypot(event.clientX - touchOrigin.x, event.clientY - touchOrigin.y);
      touchOrigin = undefined;
      if (moved > TOUCH_SLOP_PX) return;
      touchActivatedAt = performance.now();
      activate();
    });
    piece.addEventListener('click', () => {
      if (performance.now() - touchActivatedAt < TOUCH_CLICK_WINDOW_MS) return;
      activate();
    });
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
  closeContent(false);
  cancelTransition?.();
  world.dataset['scene'] = String(sceneIndex);
  const data = currentScene();
  titleNode.textContent = data.title;
  subtitleNode.textContent = data.subtitle;
  document.querySelectorAll('.scene-map a').forEach((link, index) => {
    if (index === sceneIndex) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const shouldAnimate = animate && !reduced.matches && position !== targetPosition;
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

function renderArchiveWork(work: ArchiveCard): void {
  const index = archiveCards.indexOf(work);
  const header = document.createElement('header');
  header.className = 'work-header';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'work-eyebrow';
  eyebrow.textContent = [work.year, work.venue, work.dateLabel]
    .filter((value) => value && !value.startsWith('TODO'))
    .join(' · ');
  header.append(eyebrow, closeButton);
  const title = document.createElement('h2');
  title.id = 'reveal-title';
  title.setAttribute('aria-live', 'polite');
  title.textContent = work.title;
  const details = document.createElement('div');
  details.className = 'work-details';
  details.append(title);
  const metadata = document.createElement('dl');
  metadata.className = 'work-metadata';
  for (const [label, value] of [['Año', work.year], ['Lugar', work.venue], ['Fecha', work.dateLabel], ['Estado', work.upcoming ? 'Próxima' : '']] as const) {
    if (!value || value.startsWith('TODO')) continue;
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = value;
    metadata.append(term, description);
  }
  details.append(metadata);
  for (const text of work.body ?? []) {
    const paragraph = document.createElement('p'); paragraph.className = 'work-copy'; paragraph.textContent = text;
    details.append(paragraph);
  }
  if (work.installations.length) {
    const section = document.createElement('section'); section.className = 'work-installations';
    const subheading = document.createElement('h3'); subheading.textContent = 'Instalaciones';
    const list = document.createElement('ul');
    for (const itemText of work.installations) { const item = document.createElement('li'); item.textContent = itemText; list.append(item); }
    section.append(subheading, list); details.append(section);
  }
  const media = document.createElement('figure');
  media.className = `work-media work-media--${work.media}`;
  if (work.image && work.imageAlt) {
    const image = document.createElement('img');
    image.src = withBase(`/${work.image}`, base); image.alt = work.imageAlt;
    image.loading = 'lazy'; image.decoding = 'async'; image.className = 'work-image';
    const frame = document.createElement('div'); frame.className = 'work-image-frame'; frame.append(image); media.append(frame);
  }
  if (work.metadata) { const caption = document.createElement('figcaption'); caption.className = 'work-credit'; caption.textContent = work.metadata; media.append(caption); }
  const footer = document.createElement('nav'); footer.className = 'work-navigation'; footer.setAttribute('aria-label', 'Navegar entre obras');
  const previous = archiveCards[(index + archiveCards.length - 1) % archiveCards.length]!;
  const next = archiveCards[(index + 1) % archiveCards.length]!;
  const count = document.createElement('span'); count.className = 'work-count'; count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(archiveCards.length).padStart(2, '0')}`;
  const prevButton = document.createElement('button'); prevButton.type = 'button'; prevButton.textContent = `Anterior · ← ${previous.name}`; prevButton.onclick = () => switchArchive(index - 1, 'previous');
  const nextButton = document.createElement('button'); nextButton.type = 'button'; nextButton.textContent = `Siguiente · ${next.name} →`; nextButton.onclick = () => switchArchive(index + 1, 'next');
  footer.append(count, prevButton, nextButton);
  revealBody.replaceChildren(header, media, details, footer);
}

function switchArchive(target: number, focusButton?: 'previous' | 'next'): void {
  const index = (target + archiveCards.length) % archiveCards.length;
  const work = archiveCards[index]; if (!work) return;
  const old = revealBody;
  old.classList.add('work-switching');
  window.setTimeout(() => {
    renderArchiveWork(work);
    reveal.scrollTop = 0;
    revealBody.classList.remove('work-switching');
    if (focusButton) revealBody.querySelector<HTMLButtonElement>(`.work-navigation button:${focusButton === 'previous' ? 'first-of-type' : 'last-of-type'}`)?.focus();
  }, 160);
}

function renderAboutScene(index: number, announce = false): void {
  aboutSceneIndex = (index + aboutScenes.length) % aboutScenes.length;
  const data = aboutScenes[aboutSceneIndex];
  if (!data) return;
  const root = document.createElement('div');
  root.className = 'about-panel';
  root.dataset['scene'] = data.id;

  const header = document.createElement('header');
  header.className = 'about-header';
  const kicker = document.createElement('p');
  kicker.className = 'about-kicker';
  kicker.textContent = data.kicker;
  const count = document.createElement('span');
  count.className = 'about-count';
  count.textContent = `${String(aboutSceneIndex + 1).padStart(2, '0')} / ${String(aboutScenes.length).padStart(2, '0')}`;
  header.append(kicker, count);

  const title = document.createElement('h2');
  title.id = 'reveal-title';
  title.textContent = data.title;
  const rail = document.createElement('nav');
  rail.className = 'about-rail';
  rail.setAttribute('aria-label', 'Escenas de Nosotros');
  aboutScenes.forEach((scene, sceneNumber) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'about-rail-button';
    button.textContent = `${String(sceneNumber + 1).padStart(2, '0')} ${scene.label}`;
    if (sceneNumber === aboutSceneIndex) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => renderAboutScene(sceneNumber, true));
    rail.append(button);
  });

  const content = document.createElement('section');
  content.className = `about-scene about-scene--${data.id}`;
  content.setAttribute('aria-labelledby', 'reveal-title');
  const copy = document.createElement('div');
  copy.className = 'about-copy';
  if (data.id === 'sobre') {
    data.paragraphs.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      copy.append(paragraph);
    });
    if (data.lines) {
      const list = document.createElement('ul');
      list.className = 'about-lines';
      data.lines.forEach((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        list.append(item);
      });
      copy.append(list);
    }
    if (data.image) {
      const image = document.createElement('img');
      image.src = withBase(`/${data.image.src}`, base);
      image.alt = data.image.alt;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.className = 'about-image';
      content.append(image, copy);
    } else content.append(copy);
  } else if (data.id === 'integrantes') {
    const roster = document.createElement('div');
    roster.className = 'about-roster';
    data.roster?.forEach((member, slot) => {
      const card = document.createElement('article');
      card.className = 'about-member';
      const number = document.createElement('span');
      number.className = 'about-member-number';
      number.textContent = String(slot + 1).padStart(2, '0');
      const name = document.createElement('p');
      name.textContent = member.name;
      const role = document.createElement('p');
      role.textContent = member.role;
      card.append(number, name, role);
      roster.append(card);
    });
    content.append(roster);
    if (data.note) {
      const note = document.createElement('p');
      note.className = 'about-note';
      note.textContent = data.note;
      content.append(note);
    }
  } else {
    content.classList.add('about-statement');
    data.paragraphs.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      content.append(paragraph);
    });
  }

  const live = document.createElement('span');
  live.className = 'about-live';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  live.textContent = announce ? `${String(aboutSceneIndex + 1).padStart(2, '0')} ${data.label}` : '';

  // The close button belongs to the panel chrome, not to a scene footer: at the
  // bottom of the page it read as a caption and shrank to 10px.
  header.append(closeButton);
  root.append(header, title, rail, content, live);
  revealBody.replaceChildren(root);
  // The panel is one scroller, so a scene switch starts at the first line
  // instead of inheriting the position of the previous scene.
  reveal.scrollTop = 0;
  reveal.setAttribute('aria-labelledby', 'reveal-title');
}

/**
 * The panel every block of the contact scene opens: the same hub the hidden
 * `/midi-links/` page mounts, on the paper surface. The × belongs to the panel
 * chrome, so it moves into the hub instead of floating out of its flow.
 */
function renderContactHub(): void {
  const hub = renderMidiHub({
    surface: 'paper',
    kicker: midiHub.panelKicker,
    headingId: 'reveal-title',
  });
  hub.prepend(closeButton);
  revealBody.replaceChildren(hub);
  reveal.scrollTop = 0;
  reveal.setAttribute('aria-labelledby', 'reveal-title');
}

/**
 * `panel` selects a renderer that owns its own chrome (a header with the ×) and
 * its own opening gesture. The archive, the about carousel and the contact hub
 * are the three; a plain work card has none.
 */
type PanelMode = 'about' | 'contact';

function openContent(index: number, work?: ArchiveCard, opener?: SVGRectElement, panel?: PanelMode): void {
  returnFocus = opener ?? (
    document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement
      ? document.activeElement
      : undefined
  );
  selected = index % 4;
  aboutPanelOpen = panel === 'about';
  const data = currentScene();
  if (panel === 'about') {
    // Each block of the scene opens a different chapter, so the panel does not
    // always start on the same page.
    renderAboutScene(index % aboutScenes.length);
  } else if (panel === 'contact') {
    renderContactHub();
  } else if (work) {
    renderArchiveWork(work);
  } else if (data.gallery?.length) {
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
  if (!work && !panel) reveal.append(closeButton);
  reveal.hidden = false;
  panelOpenedAt = performance.now();
  if ((work || panel) && opener) animateArchiveOpen(opener.getBoundingClientRect());
  else {
    reveal.classList.remove('archive-motion', 'archive-opening', 'archive-closing', 'archive-reduced');
    clearArchiveEdges();
    archiveSourceRect = undefined;
  }
  reveal.setAttribute('role', 'dialog');
  reveal.setAttribute('aria-modal', 'true');
  reveal.setAttribute('aria-hidden', 'false');
  reveal.focus({ preventScroll: true });
  // Making the artwork `inert` queues a focus fixup that runs right after this
  // task and drops the dialog's focus to <body>, because the piece that was
  // focused a moment ago just stopped being interactive. The panel asserts the
  // focus once more after that fixup.
  setTimeout(() => {
    if (!reveal.hidden && !reveal.contains(document.activeElement)) reveal.focus({ preventScroll: true });
  }, 0);
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

function closeContent(animate = true): void {
  const wasOpen = !reveal.hidden;
  aboutPanelOpen = false;
  const closingArchiveMotion = wasOpen && animate && animateArchiveClose();
  if (!closingArchiveMotion) {
    reveal.hidden = true;
    reveal.setAttribute('aria-hidden', 'true');
    reveal.classList.remove('archive-motion', 'archive-opening', 'archive-closing', 'archive-reduced');
    clearArchiveEdges();
    archiveSourceRect = undefined;
  }
  if (wasOpen && !closingArchiveMotion) {
    for (const sibling of [...world.children]) {
      if (sibling !== reveal) (sibling as HTMLElement).inert = false;
    }
    if (returnFocus) returnFocus.focus();
    returnFocus = undefined;
  }
}

closeButton.onclick = () => closeContent();

/**
 * A second way out: a click on the artwork around the panel closes it. The
 * panel's siblings are `inert` while it is open, so that click lands on the
 * world behind them, never on a piece. The click synthesized by the gesture
 * that just opened the panel is not a dismissal; it is ignored.
 */
document.addEventListener('click', (event) => {
  if (reveal.hidden) return;
  if (performance.now() - panelOpenedAt < OUTSIDE_CLICK_GRACE_MS) return;
  // Keyboard-activated clicks carry no coordinates and are never dismissals.
  if (event.detail === 0) return;
  // Measured, not looked up by target: a click that re-renders the panel (a rail
  // chip) removes its own target from the document, so `reveal.contains(target)`
  // would read as outside and the panel would close on itself.
  const box = reveal.getBoundingClientRect();
  const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
  if (inside) return;
  closeContent();
});

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

/**
 * The only navigation voice the HUD has left, and it starts silent: the visitor
 * gets the artwork first. After a while without touching anything, the line
 * appears with the two ways of moving and fades between them; any input sends it
 * away again and restarts the clock.
 */
const IDLE_BEFORE_SUGGESTION_MS = 7000;
const SUGGESTION_INTERVAL_MS = 9000;
/** Long enough to read as a breath, short enough not to flash. */
const SUGGESTION_FADE_MS = 420;
/** `pointermove` fires far faster than the HUD needs to react. */
const ACTIVITY_THROTTLE_MS = 250;

/** `false` shows the navigation line, `true` the artwork one. */
let showingArtworkSuggestion = false;
/** The line is on screen because nobody has moved for a while. */
let suggestionVisible = false;
let suggestionTimer: number | undefined;
let idleTimer: number | undefined;
let fadeTimer: number | undefined;
let lastActivityAt = -Infinity;
/** A hovered or focused piece owns the hint while it lasts. */
let hintHeld = false;

function navigationSuggestion(): string {
  return narrowViewport.matches ? site.suggestions.swipe : site.suggestions.scroll;
}

function currentSuggestion(): string {
  return showingArtworkSuggestion ? site.suggestions.artwork : navigationSuggestion();
}

function hideHint(): void {
  window.clearTimeout(fadeTimer);
  fadeTimer = undefined;
  whisperNode.classList.remove('is-visible');
}

function fadeHint(text: string): void {
  window.clearTimeout(fadeTimer);
  whisperNode.classList.remove('is-visible');
  fadeTimer = window.setTimeout(() => {
    whisperNode.textContent = text;
    whisperNode.classList.add('is-visible');
  }, reduced.matches ? 0 : SUGGESTION_FADE_MS);
}

function scheduleIdleSuggestion(): void {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(revealSuggestion, IDLE_BEFORE_SUGGESTION_MS);
}

function revealSuggestion(): void {
  // Reading a panel is already guided by the panel itself; try again later.
  if (!reveal.hidden || hintHeld) {
    scheduleIdleSuggestion();
    return;
  }
  suggestionVisible = true;
  showingArtworkSuggestion = false;
  whisperNode.textContent = currentSuggestion();
  whisperNode.classList.add('is-visible');
  if (reduced.matches) return;
  window.clearInterval(suggestionTimer);
  suggestionTimer = window.setInterval(cycleSuggestion, SUGGESTION_INTERVAL_MS);
}

/**
 * Any input means the visitor is moving on their own: the suggestion steps
 * aside and its clock starts over. A piece under the pointer keeps its own
 * name on screen; that name is the hint while it lasts.
 */
function noteActivity(): void {
  const now = performance.now();
  if (now - lastActivityAt < ACTIVITY_THROTTLE_MS) return;
  lastActivityAt = now;
  window.clearInterval(suggestionTimer);
  suggestionTimer = undefined;
  if (!hintHeld) {
    suggestionVisible = false;
    hideHint();
  }
  scheduleIdleSuggestion();
}

function cycleSuggestion(): void {
  // A panel on screen or a piece under the pointer is already talking.
  if (!reveal.hidden || hintHeld || document.hidden) return;
  showingArtworkSuggestion = !showingArtworkSuggestion;
  fadeHint(currentSuggestion());
}

/** On load, under reduced motion and on a media change the HUD starts silent. */
function startSuggestions(): void {
  window.clearTimeout(idleTimer);
  window.clearInterval(suggestionTimer);
  suggestionTimer = undefined;
  suggestionVisible = false;
  showingArtworkSuggestion = false;
  hintHeld = false;
  lastActivityAt = -Infinity;
  hideHint();
  scheduleIdleSuggestion();
}

/** A piece under the pointer or the focus owns the line while it lasts. */
function holdHint(text: string): void {
  hintHeld = true;
  whisperNode.textContent = text;
  whisperNode.classList.add('is-visible');
}

function releaseHint(): void {
  hintHeld = false;
  if (suggestionVisible) {
    whisperNode.textContent = currentSuggestion();
    whisperNode.classList.add('is-visible');
  } else hideHint();
}

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

// A swipe moves between scenes on both axes: vertical is the original gesture,
// horizontal is the carousel one, and the dominant axis decides when both move.
const SWIPE_PX = 55;
const PANEL_SWIPE_PX = 60;
let artworkTouch: { x: number; y: number } | undefined;
composition.addEventListener(
  'touchstart',
  (event) => {
    const touch = event.touches[0];
    if (event.touches.length === 1 && touch) artworkTouch = { x: touch.clientX, y: touch.clientY };
  },
  { passive: true },
);
composition.addEventListener(
  'touchend',
  (event) => {
    const touch = event.changedTouches[0];
    const origin = artworkTouch;
    artworkTouch = undefined;
    if (!origin || !touch) return;
    const dx = origin.x - touch.clientX;
    const dy = origin.y - touch.clientY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    advance(Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : Math.sign(dy));
  },
  { passive: true },
);
composition.addEventListener('touchcancel', () => {
  artworkTouch = undefined;
});

/**
 * Inside the about panel the same two gestures turn the carousel: a horizontal
 * swipe always does, and a vertical swipe only when the panel has no room left
 * to scroll that way — so reading a long scene is never interrupted by a scene
 * change. The boundary is read at touchstart, before the scroll of this gesture
 * has moved anything.
 */
let panelTouch: { x: number; y: number; atTop: boolean; atBottom: boolean } | undefined;
reveal.addEventListener(
  'touchstart',
  (event) => {
    const touch = event.touches[0];
    if (!aboutPanelOpen || event.touches.length !== 1 || !touch) return;
    panelTouch = {
      x: touch.clientX,
      y: touch.clientY,
      atTop: reveal.scrollTop <= 0,
      atBottom: reveal.scrollTop + reveal.clientHeight >= reveal.scrollHeight - 1,
    };
  },
  { passive: true },
);
reveal.addEventListener('touchcancel', () => {
  panelTouch = undefined;
});
reveal.addEventListener(
  'touchend',
  (event) => {
    const touch = event.changedTouches[0];
    const origin = panelTouch;
    panelTouch = undefined;
    if (!origin || !touch || !aboutPanelOpen) return;
    const dx = origin.x - touch.clientX;
    const dy = origin.y - touch.clientY;
    if (Math.abs(dx) > PANEL_SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      renderAboutScene(aboutSceneIndex + Math.sign(dx), true);
      return;
    }
    if (Math.abs(dy) > PANEL_SWIPE_PX && ((dy > 0 && origin.atBottom) || (dy < 0 && origin.atTop))) {
      renderAboutScene(aboutSceneIndex + Math.sign(dy), true);
    }
  },
  { passive: true },
);

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
  if (event.key === 'Escape' && !reveal.hidden) closeContent();
  if (!reveal.hidden && aboutPanelOpen && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault();
    renderAboutScene(aboutSceneIndex + (event.key === 'ArrowLeft' ? -1 : 1), true);
  } else if (!reveal.hidden && reveal.classList.contains('archive-motion') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault();
    const current = archiveCards.findIndex((card) => card.title === revealBody.querySelector('#reveal-title')?.textContent);
    switchArchive(current + (event.key === 'ArrowLeft' ? -1 : 1), event.key === 'ArrowLeft' ? 'previous' : 'next');
  }
  if (!reveal.hidden && event.key === 'Tab') {
    const focusable = [...reveal.querySelectorAll<HTMLElement>('button,a')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === reveal || !reveal.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !reveal.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }
});

reduced.addEventListener('change', () => {
  if (reduced.matches) setScene(false);
  startSuggestions();
});

addEventListener('popstate', () => setScene());
narrowViewport.addEventListener('change', () => {
  // Keep locked silhouettes in sync, then rebuild both hit regions and card host.
  silhouetteDefs.innerHTML = silhouetteMasks(
    [...lockedPieces].filter((name) => isLockedPiece(name, narrowViewport.matches)),
  );
  mountPieces();
  if (!hintHeld && suggestionVisible) whisperNode.textContent = currentSuggestion();
});
addEventListener('resize', () => {
  placeLabels(sceneIndex);
  layoutCards();
});

document.fonts.ready.then(() => {
  if (!cancelTransition) placeLabels(sceneIndex);
});

// Any input means the visitor is moving on their own: the suggestion hides and
// its clock starts over. These run on the window, so a panel scroll counts too.
for (const type of ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'] as const) {
  addEventListener(type, noteActivity, { passive: true });
}

adoptLegacyHash();
setScene(false);
startSuggestions();
