/** New-code design tokens. The reference hardcodes #f4f4f4 / #111111 in
 * web/style.css, src/motion/motion.mjs and src/motion/transition.mjs; that
 * duplication is retained for byte-identical visual parity and is unified in a later task.
 */
export const colors = {
  paper: '#f4f4f4',
  ink: '#111111',
} as const;

export const typeStacks = {
  primary: '"DM Mono", monospace',
  secondary: '"Roboto Mono", monospace',
} as const;

// Values are declared once as CSS custom properties in style.css and exposed
// here for TypeScript consumers without creating a second numeric scale.
export const typeScale = {
  sceneTitle: 'var(--scene-title-size)',
  sceneSubtitle: 'var(--scene-subtitle-size)',
  coordinates: 'var(--hud-coordinate-size)',
  whisper: 'var(--hud-whisper-size)',
  advance: 'var(--hud-advance-size)',
} as const;
