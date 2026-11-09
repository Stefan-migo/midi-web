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

L4 (hover language, decided by iteration): the first gesture was a flip card per
component. It was replaced because a card laid over the block competes with the
artwork, and without a photo its back face read as a grey slab with a stray rim.

The path, so it is not repeated:
- flip card per piece, then five grouped cards (five works, not ten);
- a first attempt at "the group lifts" applied only `scale(1.03)` to the sibling
  blocks, which produced NO visible change: `.geometry` sits at `fill-opacity: 0`
  and `stroke-width: 0` at rest, so scaling it scales nothing visible;
- reverted, then re-applied so every block of the card receives the full state
  the pointer gives its own block;
- fixed the highlight overflowing thin pieces (the hit boxes are crop boxes, much
  taller than the visible bar) by giving single-piece cards a 3px rim and 0.8%
  growth, and locked pieces 1.5px and 0.6%;
- replaced the flip with an INVERSION: the block itself fills with paper and
  carries the name in ink, fading in from scale(0.94). The flip is still reachable
  with `?hover=flip` for comparison and should be deleted once the inversion is
  accepted;
- removed every drawn border: the card's back face had a permanent
  `1px solid var(--ink)` that outlined an empty container, and locked pieces drew
  a 1.5px stroke. The card is delimited by contrast; locked pieces now grow 1.5%
  with an 18% fill and no outline.

Locked pieces (`solid-cap`, `solid-dot`) never open anything. Cards exist only on
`/portafolio/`; the other scenes reuse the same pieces for navigation.

L5 (open, exact state): `card-1` has the real work — MIDI4all, proyecto artístico
audiovisual del colectivo MIDILab, presentado en 990 Arte Club, Córdoba — with
`_DSC5779-web.jpg`, resized to 1600px and 231 KB from the 2.5 MB original.
`card-2` to `card-5` still say `TODO: título`.

Material dropped by the owner and NOT yet used or versioned, all under
`public/assets/portafolio/`:
- `midi4all/`: `IMG_7459.jpg`, `IMG_7460.jpg`, `_DSC5869.jpg` and the screenshot
  holding the MIDI4all text;
- `NocheDeLosMueseos-2025/Textos curatoriales.pdf`;
- `NocheDeLosMueseos-2026/Textos curatoriales - GENTE QUE NO Junio.pdf`.
Originals are never committed: only resized copies are, as with `_DSC5779-web.jpg`.

Next: read the two curated texts, fill `card-2` to `card-5`, optimise their photos,
then T3 — the piece morphing into the panel instead of the panel appearing from
the centre of the screen.
