# Paneles en celular: un toque en el archivo y el panel de Nosotros

Dos defectos que solo existen por debajo de la media query móvil: el archivo pide
dos toques para abrir una obra, y el panel de Nosotros apila el texto encima de la
fotografía porque la grilla colapsada deja a los dos hijos en la misma celda.

## Specs

S1. In the user's words: "en la página portafolio es necesario que en la versión
móvil, uno de dos, corrijamos, porque es que para que se abra el modal hay que
hacer clic dos veces, hacer como un touch dos veces y eso no está explícito.
Entonces, o bien lo dejamos de que el modal se abra solamente con un touch,
porque está extraño un poco el doble touch, o bien explicitamos el toca dos veces
en una forma, porque dice toca una forma y no funciona así en la versión móvil de
portafolio. solamente en esa, obviamente."

S2. In the user's words: "Después la versión móvil de nosotros, de la página
nosotros, cuando se abre el modal en la pestaña nosotros, también está roto. El
texto se pone por sobre la imagen. Está difícil porque es poco el espacio. Hay
que rediseñar, optimizando ese modal para que funcione en modo celular. Si es
necesario que se abra en pantalla completa, está perfecto."

S3. Heritage: only the phone layout changes; the desktop archive, the desktop
about panel and every other route keep their current geometry. Identity only
(#f4f4f4 / #111111, mono, rectangles, no radii); every piece stays reachable by
Tab and opens with Enter or Space; `prefers-reduced-motion` keeps working.

## Tasks

| ID | Specs | What | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S3 | A touch opens the archive work on that same touch; the mouse and the keyboard keep using `click`; a swipe or a drag never activates | inline | 9d2957c |
| T2 | S2, S3 | The about panel becomes a full-screen reading surface on phones: sticky header with the close button, horizontal scene rail, scene stacked as image then copy | inline | eec5876 |
| T3 | S1, S2, S3 | Phone bench at 390x844 (one tap opens, a swipe does not, the panel fits, image and copy never intersect) plus a desktop readback | inline | — |

## Log

L1 (user, verbatim): "continuamos desde la memoria (odd/midi-web/handoff)  OK, en
la página portafolio es necesario que en la versión móvil, uno de dos,
corrijamos, porque es que para que se abra el modal hay que hacer clic dos veces,
hacer como un touch dos veces y eso no está explícito. Entonces, o bien lo
dejamos de que el modal se abra solamente con un touch, porque está extraño un
poco el doble touch, o bien explicitamos el toca dos veces en una forma, porque
dice toca una forma y no funciona así en la versión móvil de portafolio. solamente
en esa, obviamente. Después la versión móvil de nosotros, de la página nosotros,
cuando se abre el modal en la pestaña nosotros, también está roto. El texto se
pone por sobre la imagen. Está difícil porque es poco el espacio. Hay que
rediseñar, optimizando ese modal para que funcione en modo celular. Si es
necesario que se abra en pantalla completa, está perfecto."

L2 (decision, mine): S1 offers two doors, and the owner's own framing prefers the
first one — the hint in the HUD says "tocá una forma", so the page promises one
touch and the fix must be the page, not the caption. Copy is not touched.

L3 (diagnosis, S1): with Chrome at 390x844 and real touch input, a single tap on
`/portafolio/` does open the panel. The gesture the owner hits is the mobile
browser habit of spending the first tap on the hover state of a `:hover`-styled
element; on that class of device the synthetic `click` only arrives on the second
tap. The activation therefore moves to the touch itself (`pointerup` on a
non-mouse pointer inside a small movement budget), which every touch browser
delivers on the first tap, and the `click` that follows the same gesture is
ignored so a work never opens twice.

L4 (diagnosis, S2): the overlap is a collapsed grid, not a missing rule. At
`max-width: 760px` `.about-scene--sobre` sets a single column but keeps
`grid-template-rows: minmax(0, 1fr)` from the desktop rule, and both children end
up in row 1: the photograph (placed by `grid-row: 1`) and the copy (auto-placed).
On top of that the panel still uses `inset: 9% 9%`, so at 390px the reading column
is ~178px wide after the 92px rail — unreadable even once the overlap is gone.

L5 (decision, S2): at `max-width: 760px` the about panel takes the whole viewport,
the rail turns horizontal under the title, and the scene becomes one flow: image
(4/3, cover) then copy, with the panel itself scrolling. The owner authorized the
full-screen panel in S2.

L6 (evidence, T3): a headless-Chrome bench with real touch input at 390x844
opens the work panel with one tap (`#reveal.hidden === false` after a single
`touchStart`/`touchEnd`), opens the about panel with one tap, and never opens a
panel after a 120px swipe. On `/nosotros/` the panel measures 0,0,390x844, the
photograph and the copy never intersect on the three scenes, the panel reports no
horizontal overflow, the close button is a 44x44 target, the rail is one row of
three chips, and the last block of the copy is reachable. Repeated at 360x640 and
430x932 and under `prefers-reduced-motion: reduce`. A desktop readback at
1440x900 keeps the 9% inset, the two columns and the vertical rail, so the
phone rules changed nothing above 760px. `npm run verify` is green.

L7 (verification, RDD): the native review of this candidate (lenses readability
and reliability, medium tier, 165 changed lines) is **approved** and its receipt
is burned. Its only finding is informational and non-blocking — R2-001,
readability, `src/main.ts:416-422` — so it opens no correction and is later work,
never a reason to review this candidate again. An independent verifier
(`gentle-ai-verify`) was launched for the item-6 declaration and could not run:
its model provider was unavailable. No verdict exists for it, it is not retried
or escalated, and the proof of this change stays the bench in L6 plus
`npm run verify`, both run by the writer.
