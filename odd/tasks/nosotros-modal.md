# Nosotros: el panel como carrusel de escenas

La ruta /nosotros/ deja de abrir un panel de texto plano: cada elemento abre un
panel con tres escenas dentro —sobre, integrantes y manifiesto— que se recorren
sin cerrar el panel, con el mismo gesto de apertura que el archivo.

## Specs

S1. In the user's words: "agrege a assets la carpeta nosotros. quiero que dise;es y
me pases versiones de como se va a ver el modal y las animaciones/transicines para
abrir los modals. aqui todos elementos van a abrir un modal igual como lo hicimos
en protafolio."

S2. In the user's words: "un modal que estilo carrousel. donde van cambiando varias
escenas. la primera sera un about us de MIDI como grupo despues van tiene que ahber
una escena de integrantes, y una quizas de manisfiesto"

S3. Heritage: identity only (#f4f4f4 and #111111, DM Mono and Roboto Mono,
rectangles, zero radii, no third colour); no invented names, roles, dates or
credits; motion respects prefers-reduced-motion; everything reachable by keyboard.

## Evidence

- public/assets/nosotros/ holds exactly two files: `Copia de Borrador MIDI.docx.pdf`
  and `IMG_0830.JPG` (the group photograph in front of the ruins).
- The document has real copy for the about text, the artistic proposal, the four
  líneas de trabajo, the technical means and a closing paragraph that works as a
  manifesto. Its **Equipo section is empty**: there are no names and no roles.
- Consequence: the integrantes scene is drawn as a composed roster of slots marked
  TODO, never filled with invented people.

## Tasks

| ID | Specs | What | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1, S2 | Three artboards in design/midi-nosotros/ for three carousel strategies | design | — |
| T2 | S1, S2 | The owner picks one; the panel of /nosotros/ becomes that carousel with the archive's opening gesture | writer | — |
| T3 | S2 | Content: names and roles for the integrantes scene, plus the group photo optimised to WebP | owner + writer | — |

## Log

L1 (user, verbatim): "perfecto agrege a assets la carpeta nosotros. quiero que
dise;es y me pases versiones de como se va a ver el modal y las animaciones/
transicines para abrir los modals. aqui todos elementos van a abrir un modal igual
como lo hicimos en protafolio. un modal que estilo carrousel. donde van cambiando
varias escenas. la primera sera un about us de MIDI como grupo despues van tiene
que ahber una escena de integrantes, y una quizas de manisfiesto"

L2 (decision, mine): the opening gesture does not vary between the three versions.
It is the one already in production (the clicked block is cut into four rectangles
that flatten into the panel's hairline), because the owner asked for the same
modal as the archive. What varies between the artboards is the carousel strategy.

L3 (owner, decision): "lo dejaremos como slots por ahora. Luego rellenamos esa
info." The integrantes scene stays as a composed roster of TODO slots; no names,
roles or per-person photographs are required to ship it. When the owner supplies
them, only that scene's data changes, never the carousel or the panel.


L4 (iteration after the owner's review): three defects, one cause each.
1. The copy could not be read from the start: `.about-scene` centred a scroll
   container (`align-content: center`), which splits the overflow between top and
   bottom and leaves the beginning unreachable. Now the scene never centres and
   only the copy column scrolls, starting at its first line.
2. The photograph was small: `#reveal img` (more specific than the class) forced
   `object-fit: contain` and `margin: auto`, and the grid rows had no definite
   height. Now `#reveal .about-image` fills its column with `cover`, and the panel
   of this route is widened to `inset: 9% 9%` — a reading route was sharing the
   archive's card inset and the copy column came out too narrow.
3. The close button was 10px: the renderer moved it into a scene footer and the
   CSS restyled it as a caption. It now lives in the panel header at 40px with a
   44px hit area.

L5 (interaction): each block of `/nosotros/` opens a different chapter — the
panel starts on `index % 3`, so the ten pieces distribute over Sobre, Integrantes
and Manifiesto instead of all opening the same page.

