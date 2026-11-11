/**
 * The contact hub, rendered once and mounted twice: as the whole of the hidden
 * `/midi-links/` page and as the panel behind every block of `/contacto/`.
 *
 * Order follows the owner's reference: mark, name, subtitle, icon row, cards.
 * The mark is a solid square, not a circle: the identity fixes zero radii.
 */

import { midiHub, type MidiLink } from '../content/midi-links';
import { iconSvg } from '../lib/icons';
import { withBase } from '../lib/routes';
import '../styles/hub.css';

export type HubSurface = 'ink' | 'paper';

export interface HubOptions {
  /** Which way the two identity colours turn. `ink` is the hidden page. */
  readonly surface: HubSurface;
  /** The label voice above the mark; the panel and the page use different ones. */
  readonly kicker?: string;
  /**
   * Which surface of the design this mount is. A card marked `onlyOnPage` is
   * content of the hidden page only, never of the contact panel.
   */
  readonly placement: 'page' | 'panel';
  /** `1` when the hub is the page, `2` when it is the panel's content. */
  readonly headingLevel?: 1 | 2;
  /** The panel labels its dialog with this id. */
  readonly headingId?: string;
}

const base = import.meta.env.BASE_URL;
/** On ink the tile is paper and the isotipo is ink, and the other way around. */
const MONOGRAM: Record<HubSurface, string> = {
  ink: 'assets/isotipo-solido-negro.svg',
  paper: 'assets/isotipo-solido-blanco.svg',
};

function hrefFor(href: string): string {
  return href.startsWith('/') ? withBase(href, base) : href;
}

function iconLink(link: MidiLink): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.className = 'midi-hub-icon';
  anchor.href = hrefFor(link.href);
  const name = link.note ? `${link.label} — ${link.note}` : link.label;
  anchor.setAttribute('aria-label', name);
  anchor.title = name;
  if (/^https?:/i.test(link.href)) {
    anchor.target = '_blank';
    anchor.rel = 'noopener';
  }
  if (link.icon) anchor.innerHTML = iconSvg(link.icon);
  return anchor;
}

export function renderMidiHub(options: HubOptions): HTMLElement {
  const root = document.createElement('section');
  root.className = 'midi-hub';
  root.dataset['surface'] = options.surface;

  if (options.kicker) {
    const kicker = document.createElement('p');
    kicker.className = 'midi-hub-kicker';
    kicker.textContent = options.kicker;
    root.append(kicker);
  }

  const body = document.createElement('div');
  body.className = 'midi-hub-body';

  const mark = document.createElement('div');
  mark.className = 'midi-hub-mark';
  const monogram = document.createElement('img');
  monogram.src = withBase(`/${MONOGRAM[options.surface]}`, base);
  // The name is the next element; the mark is decoration.
  monogram.alt = '';
  monogram.width = 202;
  monogram.height = 172;
  monogram.decoding = 'async';
  mark.append(monogram);

  const headingId = options.headingId ?? 'midi-hub-title';
  const title = document.createElement(options.headingLevel === 1 ? 'h1' : 'h2');
  title.className = 'midi-hub-title';
  title.id = headingId;
  title.textContent = midiHub.name;

  const subtitle = document.createElement('p');
  subtitle.className = 'midi-hub-subtitle';
  subtitle.textContent = midiHub.subtitle;

  const icons = document.createElement('nav');
  icons.className = 'midi-hub-icons';
  icons.setAttribute('aria-label', 'Redes y contacto');
  for (const link of midiHub.links) icons.append(iconLink(link));

  const list = document.createElement('ul');
  list.className = 'midi-hub-links';
  for (const entry of midiHub.cards) {
    if (entry.onlyOnPage && options.placement !== 'page') continue;
    const item = document.createElement('li');
    const card = document.createElement('a');
    card.className = 'midi-hub-card';
    card.href = hrefFor(entry.href);
    const cardLabel = document.createElement('span');
    cardLabel.textContent = entry.label;
    const arrow = document.createElement('span');
    arrow.className = 'midi-hub-card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    card.append(cardLabel, arrow);
    item.append(card);
    list.append(item);
  }

  body.append(mark, title, subtitle, icons, list);
  root.append(body);
  root.setAttribute('aria-labelledby', headingId);
  return root;
}
