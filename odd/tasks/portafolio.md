# Portafolio interactivo

Las diez piezas del archivo se vuelven componentes con hover propio y abren un
panel que se transforma desde la pieza.

## Specs

S1. In the user's words: "lo primero que hay que hacer es darle interactividad a
la pagina portafolio. Actualmente portafolio tiene los logos estirados hacia cada
lado. Hay que dividir, si es que no esta dividido ya, en secciones cada logo."

S2. In the user's words: "La idea aqui es poder generar hovers sobre las
diferentes secciones de la pagina y asi al dividirlos y generar estos hovers
vamos a tener componentes."

S3. In the user's words: "Cuando se pase el mouse por sobre alguno de estos
componentes, el hover es generar otro motion graphic y mostrar quiza el nombre de
la obra, de la exposicion o lo que sea que se quiera mostrar en el portafolio."

S4. In the user's words: "La idea aqui es generar componentes que se puedan abrir
con un dialogo, con un modal, con un pop-up modal, donde podamos mostrar
finalmente cada obra... luego al hacer clic esto se abre y tambien se tiene que
abrir con otro motion graphic que va a transformar ese componente en el modal, en
el dialogo que se abre."

S5. In the user's words: "lo podemos probar localmente primero?"

S6. Metadata decision, in the user's words: "Usa placeholders marcados como TODO."

## What already exists (evidence, not assumption)

- `src/motion/transition.mjs` holds a table of ten named pieces: `solid-cap`,
  `solid-left`, `solid-right`, `solid-dot`, `solid-stem`, `outline-cap`,
  `outline-left`, `outline-right`, `outline-dot`, `outline-stem`. Each has a
  `from` bounds in the stretched-logo field and a `to` bounds in the assembled
  composition.
- `regions[1]` in `src/motion/site-motion.mjs` lists ten boxes in the same order,
  matching those `from` bounds, so the click targets are already correct.
- The resting art at `/portafolio/` is `draw(1)` = `stretchLogos(1)`, emitted as
  one SVG string with no per-piece identity in the DOM.
- `src/styles/style.css` carries `.piece:hover .geometry { stroke-width: 12 }`,
  which never fires: `.geometry` lives in the art layer while the hit rects live
  in a separate SVG. The hover is written and dead.

## Decision

The division is a data problem already solved. The work is to render the resting
archive as ten addressable groups, one per named piece, cropping
`stretchLogos(1)` by each piece's `from` bounds with the same `crop` helper the
transition already uses. No new artwork is invented; the geometry is the one
already shipping.

## Rules

- Identity only: `#f4f4f4` and `#111111`, DM Mono and Roboto Mono, rectangles,
  no radii.
- Do not invent obra names, years or credits. Every placeholder is a `TODO`.
- Hover and the morph must respect `prefers-reduced-motion`.
- Keyboard: each component must be reachable by Tab and open with Enter or Space.

## Tasks

| ID | Specs | What | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S2 | Render the resting archive as ten addressable piece groups, with hit rects mapped to them | writer | — |
| T2 | S3 | Hover motion per piece plus the label that names it | writer | — |
| T3 | S4 | Click morphs the piece into the panel | writer | — |

## Log

L1 (user, verbatim): "Ok, lo primero que hay que hacer es darle interactividad a
la pagina portafolio. Actualmente portafolio tiene los logos estirados hacia cada
lado. Hay que dividir, si es que no esta dividido ya, en secciones cada logo. La
idea aqui es poder generar hovers sobre las diferentes secciones de la pagina y
asi al dividirlos y generar estos hovers vamos a tener componentes. La idea aqui
es generar componentes que se puedan abrir con un dialogo, con un modal, con un
pop-up modal, donde podamos mostrar finalmente cada obra. Esa es la idea. Cuando
se pase el mouse por sobre alguno de estos componentes, el hover es generar otro
motion graphic y mostrar quiza el nombre de la obra, de la exposicion o lo que
sea que se quiera mostrar en el portafolio. y luego al hacer clic esto se abre y
tambien se tiene que abrir con otro motion graphic que va a transformar ese
componente en el modal, en el dialogo que se abre. es posible algo asi? lo
podemos probar localmente primero?"

L2 (decision): placeholders marked TODO for any obra metadata, until the owner
supplies real values.

L3 (correction, mine): I previously told the owner that the portafolio click
targets sat over an unrelated logo. They do not: they match the ten stretched
pieces in order. The observation was wrong and is corrected here.
