/**
 * The archive is published as five cards over ten pieces. Cards combine pieces
 * because ten separate works would be noise, and two pieces stay locked: they
 * answer with a subtle scale under the pointer and never flip.
 *
 * Piece names come from `src/motion/transition.mjs`; the grouping follows the
 * owner's annotations over the running page.
 *
 * TODO(T-portafolio): four of the five titles are still placeholders. The
 * MIDI4all entry comes from the presentation sheet the owner supplied:
 * "MIDI4all", proyecto artístico audiovisual del colectivo MIDILab, presentado
 * en 990 Arte Club, Córdoba, Argentina.
 */

export interface ArchiveCard {
  id: string;
  /** Piece names this card covers. One entry or several. */
  pieces: string[];
  title: string;
  subtitle: string;
  /** Site-root-relative path, e.g. `assets/portafolio/obra-01.jpg`. */
  image?: string;
  /** Required when `image` is set, for assistive technology. */
  imageAlt?: string;
}

/** Pieces with no card: they only grow slightly under the pointer. */
export const lockedPieces = new Set(['solid-cap', 'solid-dot']);

export const archiveCards: ArchiveCard[] = [
  {
    id: 'card-1',
    pieces: ['solid-left', 'solid-right'],
    title: 'MIDI4all',
    subtitle: '990 Arte Club · Córdoba',
    image: 'assets/portafolio/midi4all/_DSC5779-web.jpg',
    imageAlt:
      'Presentación de MIDI4all en 990 Arte Club: dos personas frente a laptops y controladores sobre el escenario, con luz azul y una proyección del isotipo MIDI.',
  },
  {
    id: 'card-2',
    pieces: ['solid-stem'],
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'card-3',
    pieces: ['outline-dot'],
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'card-4',
    pieces: ['outline-stem'],
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'card-5',
    pieces: ['outline-cap', 'outline-left', 'outline-right'],
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
];

/** The card a piece belongs to, if it has one. */
export function cardForPiece(piece: string): ArchiveCard | undefined {
  return archiveCards.find((card) => card.pieces.includes(piece));
}

/** Label for a piece: its card title when it belongs to one. */
export function pieceLabel(piece: string): string {
  return cardForPiece(piece)?.title ?? 'TODO: pieza';
}
