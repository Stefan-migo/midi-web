export interface MidiLink {
  readonly label: string;
  readonly href: string;
  readonly note?: string;
}

// Destinations are sourced from the existing contact scene in src/content/site.ts.
export const midiLinks: readonly MidiLink[] = [
  { label: 'holamidi.info@gmail.com', href: 'mailto:holamidi.info@gmail.com' },
  { label: 'Instagram / midi4all', href: 'https://www.instagram.com/midi4all/' },
  { label: 'TikTok / midi4all', href: 'https://www.tiktok.com/@midi4all' },
];
