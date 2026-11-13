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
 * The page and the panel show the same thing, on purpose: the owner asked for
 * them to stay in sync, so nothing here is filtered per surface any more.
 */

/** The glyph drawn for one network. `src/lib/icons.ts` owns each drawing. */
export type MidiLinkIcon = 'instagram' | 'mail' | 'tiktok' | 'youtube';

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
  subtitle: 'Colectivo artístico',
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
      href: 'mailto:contacto@holamidi.com',
      icon: 'mail',
      note: 'contacto@holamidi.com',
    },
    {
      label: 'TikTok',
      href: 'https://www.tiktok.com/@midi4all',
      icon: 'tiktok',
      note: '@midi4all',
    },
    {
      label: 'YouTube',
      href: 'https://www.youtube.com/@holamidi',
      icon: 'youtube',
      note: '@holamidi',
    },
  ],
  cards: [
    {
      label: 'Noche de los museos 2026',
      href: '/midi-links/noche-museos/',
    },
    { label: 'Sitio principal', href: '/' },
  ],
};
