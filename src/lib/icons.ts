/**
 * The geometric glyphs of the contact hub.
 *
 * Inline SVG, not files: they inherit `currentColor`, so the same drawing works
 * on paper and on ink, and the identity stays at two colours. The Instagram
 * frame is a square for the same reason the site has no radii — it is the
 * network's mark read through the collective's geometry, not a redraw of it.
 */

import type { MidiLinkIcon } from '../content/midi-links';

const glyphs: Record<MidiLinkIcon, string> = {
  instagram:
    '<rect x="3.6" y="3.6" width="16.8" height="16.8"/>' +
    '<circle cx="12" cy="12" r="4.1"/>' +
    '<circle cx="16.9" cy="7.1" r="1" fill="currentColor" stroke="none"/>',
  mail: '<rect x="2.6" y="5.4" width="18.8" height="13.2"/>' + '<path d="M3.2 6.1 12 12.8 20.8 6.1"/>',
  tiktok:
    '<path d="M13.6 3.4v10.2a3.6 3.6 0 1 1-3.6-3.6"/>' +
    '<path d="M13.6 3.4c.5 2.7 2.3 4.4 5.1 4.7"/>',
  // The screen is a rectangle, so the network's rounded box reads as the same
  // square every other mark in the site uses.
  youtube:
    '<rect x="2.6" y="5.4" width="18.8" height="13.2"/>' + '<path d="M10.2 9.2 15.4 12l-5.2 2.8z"/>',
};

/** The markup of one glyph, always decorative: the anchor carries the name. */
export function iconSvg(name: MidiLinkIcon): string {
  return (
    '<svg class="midi-hub-glyph" viewBox="0 0 24 24" width="24" height="24" fill="none" ' +
    `stroke="currentColor" stroke-width="1.5" aria-hidden="true" focusable="false">${glyphs[name]}</svg>`
  );
}
