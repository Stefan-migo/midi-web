/**
 * The contact hub: every destination the collective publishes, in one place.
 *
 * The same content feeds the two surfaces of the design — the hidden
 * `/midi-links/` page and the panel that every block of `/contacto/` opens — so
 * the page and the modal can never drift apart.
 *
 * Sources: the owner's link page (logo, subtitle, icon row, one card to the
 * site) and the contact scene in `./site.ts`. The event links of the reference
 * are deliberately absent.
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

export interface MidiHub {
  readonly name: string;
  readonly subtitle: string;
  /** The label voice of the hidden page. */
  readonly kicker: string;
  /** The label voice of the panel inside the site. */
  readonly panelKicker: string;
  readonly links: readonly MidiLink[];
  /** The one card under the icons: the way back to the site. */
  readonly home: { readonly label: string; readonly href: string };
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
  home: { label: 'Sitio principal', href: '/' },
};
