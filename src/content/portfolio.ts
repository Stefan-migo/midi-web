/**
 * The ten pieces of the archive, keyed by the names the motion engine already
 * uses (`src/motion/transition.mjs`). The label is what appears on hover and in
 * the accessible name of each component.
 *
 * TODO(T-portafolio): every label here is a placeholder. Real obra names, years
 * and credits have to come from the owner; inventing them would publish false
 * statements about a real collective.
 */

export interface ArchivePiece {
  /** Must match a `name` in the motion engine's piece table. */
  id: string;
  label: string;
}

export const archivePieces: ArchivePiece[] = [
  { id: 'solid-cap', label: 'TODO: obra de solid-cap' },
  { id: 'solid-left', label: 'TODO: obra de solid-left' },
  { id: 'solid-right', label: 'TODO: obra de solid-right' },
  { id: 'solid-dot', label: 'TODO: obra de solid-dot' },
  { id: 'solid-stem', label: 'TODO: obra de solid-stem' },
  { id: 'outline-cap', label: 'TODO: obra de outline-cap' },
  { id: 'outline-left', label: 'TODO: obra de outline-left' },
  { id: 'outline-right', label: 'TODO: obra de outline-right' },
  { id: 'outline-dot', label: 'TODO: obra de outline-dot' },
  { id: 'outline-stem', label: 'TODO: obra de outline-stem' },
];

/** Label for a piece id, falling back to the id so a mismatch is visible. */
export function pieceLabel(id: string): string {
  return archivePieces.find((piece) => piece.id === id)?.label ?? id;
}
