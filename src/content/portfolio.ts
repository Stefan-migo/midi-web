/**
 * The ten pieces of the archive, keyed by the names the motion engine already
 * uses (`src/motion/transition.mjs`).
 *
 * TODO(T-portafolio): every title and subtitle here is a placeholder. Real obra
 * names, years and credits have to come from the owner; inventing them would
 * publish false statements about a real collective.
 *
 * To add a real card, drop the image in `public/assets/portafolio/` and fill in
 * `title`, `subtitle` and `image` for that piece. Nothing else needs to change.
 */

export interface ArchivePiece {
  /** Must match a `name` in the motion engine's piece table. */
  id: string;
  /** Shown in the HUD on hover and used as the accessible name. */
  label: string;
  /** Card heading. */
  title: string;
  /** Card line under the heading. */
  subtitle: string;
  /** Site-root-relative path, e.g. `assets/portafolio/obra-01.jpg`. */
  image?: string;
  /** Required when `image` is set, for assistive technology. */
  imageAlt?: string;
}

export const archivePieces: ArchivePiece[] = [
  {
    id: 'solid-cap',
    label: 'TODO: obra de solid-cap',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'solid-left',
    label: 'TODO: obra de solid-left',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'solid-right',
    label: 'TODO: obra de solid-right',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'solid-dot',
    label: 'TODO: obra de solid-dot',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'solid-stem',
    label: 'TODO: obra de solid-stem',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'outline-cap',
    label: 'TODO: obra de outline-cap',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'outline-left',
    label: 'TODO: obra de outline-left',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'outline-right',
    label: 'TODO: obra de outline-right',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'outline-dot',
    label: 'TODO: obra de outline-dot',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
  {
    id: 'outline-stem',
    label: 'TODO: obra de outline-stem',
    title: 'TODO: título',
    subtitle: 'TODO: subtítulo',
  },
];

/** Full card data for a piece id, or undefined when the id is unknown. */
export function pieceData(id: string): ArchivePiece | undefined {
  return archivePieces.find((piece) => piece.id === id);
}

/** Label for a piece id, falling back to the id so a mismatch is visible. */
export function pieceLabel(id: string): string {
  return pieceData(id)?.label ?? id;
}
