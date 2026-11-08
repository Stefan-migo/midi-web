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
