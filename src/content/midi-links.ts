/**
 * The contact hub: every destination the collective publishes, in one place.
 *
 * The same content feeds the two surfaces of the design — the hidden
 * `/midi-links/` page and the panel that every block of `/contacto/` opens — so
 * the page and the modal can never drift apart.
 *
 * Sources: the owner's link page (logo, subtitle, icon row, cards under them)
 * and the contact scene in `./site.ts`.
 *
 * The live-viewer card of Noche de los museos belongs to the hidden page only:
 * the contact panel reuses this component and the `contacto-hub` feature kept
 * event links out of it on purpose.
 */

/** The glyph drawn for one network. `src/lib/icons.ts` owns each drawing. */
export type MidiLinkIcon = 'instagram' | 'mail' | 'tiktok';

export interface MidiLink {
  readonly label: string;
  readonly href: string;
  /** Without an icon the link is drawn as a text row. */
  readonly icon?: MidiLinkIcon;
  /** The handle or address behind the icon, used as its accessible name. */
  readonly note?: string;
}

/** One card under the icons: a destination of the hub. */
export interface MidiHubCard {
  readonly label: string;
  readonly href: string;
  /**
   * Keeps the card on `/midi-links/` and off the `/contacto/` panel, which
   * mounts the same hub on the opposite surface.
   */
  readonly onlyOnPage?: boolean;
}

export interface MidiHub {
  readonly name: string;
  readonly subtitle: string;
  /** The label voice of the hidden page. */
  readonly kicker: string;
  /** The label voice of the panel inside the site. */
  readonly panelKicker: string;
  readonly links: readonly MidiLink[];
  /** The cards under the icons, in reading order. */
  readonly cards: readonly MidiHubCard[];
}

export const midiHub: MidiHub = {
  name: 'MIDI',
  subtitle: 'Colectivo artístico multimedial',
  kicker: '/links',
  panelKicker: 'MIDI · contacto',
  links: [
    {
      label: 'Instagram',
      href: 'https://www.instagram.com/midi4all/',
      icon: 'instagram',
      note: '@midi4all',
    },
    {
      label: 'Correo',
      href: 'mailto:holamidi.info@gmail.com',
      icon: 'mail',
      note: 'holamidi.info@gmail.com',
    },
    {
      label: 'TikTok',
      href: 'https://www.tiktok.com/@midi4all',
      icon: 'tiktok',
      note: '@midi4all',
    },
  ],
  cards: [
    {
      label: 'Noche de los museos 2026',
      href: '/midi-links/noche-museos/',
      onlyOnPage: true,
    },
    { label: 'Sitio principal', href: '/' },
  ],
};
