/**
 * Content contract for the MIDI site.
 *
 * See `odd/tasks/midi-site-platform.md` ("Data contract"). This file is the
 * single definition of the shape; content itself lives in `./site.ts`.
 *
 * Rule: content is data. No copy may live inside a render function.
 */

/** Route slug. Also the legacy hash alias target of the reference site. */
export type SceneId =
  | 'inicio'
  | 'portafolio'
  | 'nosotros'
  | 'contacto'
  | 'exploraciones';

export interface SceneLink {
  label: string;
  href: string;
  kind: 'mailto' | 'social';
}

export interface GalleryItem {
  /** Path relative to the site root, e.g. `assets/estudio-7.png`. */
  src: string;
  /** Required: the reference renders these as decoration with no text at all. */
  alt: string;
  title?: string;
  year?: string;
  credits?: string;
}

export interface SceneBody {
  heading: string;
  /** Plain text, no markup. The renderer owns the wrapping. */
  paragraphs: string[];
  links?: SceneLink[];
}

export interface Scene {
  id: SceneId;
  /** 0-based. Drives the HUD counter and the motion frame budget lookup. */
  order: number;
  /** Accessible name for the HUD square. Never the raw route slug. */
  navLabel: string;
  title: string;
  subtitle: string;
  /** Absent for artwork-only scenes. */
  body?: SceneBody;
  gallery?: GalleryItem[];
}

/**
 * The suggestions that cycle over the artwork, one at a time.
 *
 * They are the whole of the HUD's navigation voice: the reference's five
 * squares, counter and pause button are gone, so the instruction to move is a
 * line that appears and leaves instead of a permanent control.
 */
export interface SiteSuggestions {
  /** Desktop: how the scene changes. */
  readonly scroll: string;
  /** Narrow viewports: the same instruction as a swipe. */
  readonly swipe: string;
  /** The other way in: the artwork itself is the navigation. */
  readonly artwork: string;
}

export interface Site {
  name: string;
  /**
   * Optional: no sourced value exists yet. Do not fill it with invented copy —
   * see `TODO(T2)` in `./site.ts`.
   */
  tagline?: string;
  /** Ordered by `order`. Exactly one scene per `SceneId`. */
  scenes: Scene[];
  suggestions: SiteSuggestions;
}
