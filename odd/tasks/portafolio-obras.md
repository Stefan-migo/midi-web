# Portafolio: las obras reales y la apertura del panel

Cada card del archivo pasa a tener contenido real —texto curatorial e imagen— y
el panel se abre con un gesto propio en vez de aparecer desde el centro.

## Specs

S1. In the user's words: "ahora quiero que trabajemos en la animacion para cuando
se abre el modal. se puede crear un efecto/animacion profesional para la
apuertura del modal donde va a estar la informacion de cada obra."

S2. In the user's words: "ya he agregado imagenes a todas las obras y tambien
textos curatorios. revisalos y crea cada una una de las obras del portafolio."

S3. In the user's words: "podriamos mostrarme alternativas de animaciones. ya sea
con referencias con en una canvas temporal especifico para eso?"

S4. Heritage from odd/tasks/portafolio.md: no invented names, years or credits;
every unknown is a TODO. Identity only: #f4f4f4 and #111111, mono, rectangles,
no radii. Motion respects prefers-reduced-motion; every piece is reachable by Tab
and opens with Enter or Space.

## Tasks

| ID | Specs | What | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S2 | Read the curatorial material and write the five works into src/content/portfolio.ts (title, venue, year, body, photo, alt) | writer | — |
| T2 | S2 | Photo pipeline: HEIC to JPEG where needed, 1600px, quality 82, commit only the resized copy | inline | — |
| T3 | S1, S3 | Modal opening: three directions in design/midi-modal-obras/, the owner picks one, then it is implemented in the real panel | design then writer | — |
| T4 | S1 | Replace the centre unfold in src/styles/style.css with the chosen gesture, keyboard and reduced motion included | writer | — |

## Log

L1 (user, verbatim): "ok perfecto anda bien. ahora quiero que trabajemos en la
animacion para cuando se abre el modal. se puede crear un efecto/animacion
profesional para la apuertura del modal donde va a estar la informacion de cada
obra. ya he agregado imagenes a todas las obras y tambien textos curatorios.
revisalos y crea cada una una de las obras del portafolio. podriamos mostrarme
alternativas de animaciones. ya sea con referencias con en una canvas temporal
especifico para eso?"

L2 (evidence, the material as it stands): four events carry curatorial text.
NocheDeLosMueseos-2025/Textos curatoriales.pdf covers "Arteología Digital", "Dejá
tu huella" and "Cadena de Memorias". AniversarioReformaUniversitaria/Textos
curatoriales - GENTE QUE NO Junio.pdf covers "Reafirmá la Reforma", "Archivo en
movimiento" and "Memoria en lo alto" (Gente que no, La Reforma en Primera Plana,
Centro Cultural UNC, 19 de junio). NocheDeLosMueseos-2026/Propuesta NM 2026 -
MIDI.pdf is a proposal, not a realised work: "Borges y la coincidencia de los
opuestos", 13 de noviembre de 2026. midi4all/ has the project sheet, not a
curatorial text.

L3 (evidence, the gap): GenteQueNo/ (ROBIDU live set, 16 de octubre, Patio CCU)
has five HEIC photographs and all five are unusable — near black, no subject. Its
only publishable asset is the flyer.

L4 (decision, design): the three opening directions live in
design/midi-modal-obras/. They differ in strategy, not in colour: the block
growing into the panel, the block opening a field of projection bands, and the
block being cut into the panel frame. The owner picks one; the others stay as
alternatives.

L5 (owner, decisions): five works, one per event. On the grouping: "Por evento
pero el gente que no e robidu fue en 2025, el de la reforma fue en 2026". On
Noche de los Museos 2026: "Publicarla ya, marcada como próxima".

## The five works (decided)

| # | Pieces | Title | Year | Venue and date | Material |
| --- | --- | --- | --- | --- | --- |
| 1 | solid-left, solid-right | MIDI4all | TODO | 990 Arte Club, Córdoba | the project sheet + 6 photos |
| 2 | solid-stem | Gente que no · La Reforma en Primera Plana | 2026 | Centro Cultural UNC, 19 de junio | 3 curatorial texts + 7 photos + 2 posters |
| 3 | outline-dot | Gente que no · ROBIDU live set | 2025 | Patio CCU, Obispo Trejo 314, 16 de octubre | the flyer only |
| 4 | outline-stem | Noche de los Museos 2025 | 2025 | Centro Cultural UNC, 7 de noviembre | 3 curatorial texts + 5 photos + 2 posters |
| 5 | outline-cap, outline-left, outline-right | Noche de los Museos 2026 · Borges o la coincidencia de los opuestos | 2026 | Centro Cultural UNC, 13 de noviembre · próxima | the proposal text + 3 graphics |

L6 (rules for the text): each card carries the event, year, venue and date, a two
or three paragraph body taken verbatim from the curatorial PDFs, and the
installations it contained. Never invent a name, a year, a credit or a link.
MIDI4all's year is not in any source: it stays TODO.


L8 (owner, decision): direction C, in the owner's words "ok vamos con C". The
chosen artboard is design/midi-modal-obras/03-el-bloque-se-recompone.html: the
piece is cut into four rectangles that fly and flatten into the paper frame, and
the body of the panel opens between that frame and its 10px ink gap. 01 and 02
stay as alternatives.

L9 (sequencing): T4 waits for the running content worker. Both would write
src/main.ts and src/styles/style.css, and this process never runs two writers on
overlapping surfaces.


L10 (implemented, direction C): worker loaded the five works (T1) and optimized
five hero images (T2); then the archive panel opens by recomposing the clicked
piece into its hairline frame (T4). Timings: slices 500ms staggered 40ms,
cubic-bezier(.16,1,.3,1); body clip-path 340ms starting at 340ms; content from
520ms, 440ms each, staggered 40ms; closing 260ms/20ms plus a 180ms body close.
Reduced motion skips travel entirely. Non-archive panels keep the old unfold.

L11 (correction, mine): the frame was measured on `#reveal`, whose padding is 5%,
so the hairline floated far from the paper at large viewports. `archiveFrameBoxes`
now takes the paper body's rect and offsets it by `ARCHIVE_FRAME_GAP_PX = 10`, the
identity's ink border, so the hairline hugs the paper at every size.

L12 (open): MIDI4all's year and date are still TODO and are omitted from the panel
instead of being printed; ROBIDU has no curatorial body. Two hero images exceed
the 231 KB precedent (Borges graphic 488 KB, Reforma 303 KB). Not yet committed.

L13 (incident, after the first review of direction C): two defects, both visible
to the owner as "the modal is completely broken".
1. Three of the five hero images answered `200 text/html` instead of `image/jpeg`:
   the dev server had indexed `public/` before the files existed. A restart fixes
   it; production builds copy `public/` fresh. Always restart the dev server after
   adding an image, and check `content-type`, never just the status code.
2. My CSS moved the paper from `#reveal` to `#reveal-body` (`background:
   transparent` on the panel). The close button, the scrollbar and the 5% padding
   were left floating on the ink, and `#reveal-body > * { opacity: 0 }` hid every
   element after the fourth, so a work's body and image never appeared.
Corrected: the panel keeps its own paper, border and scroll; the panel itself is
what clips open (`clip-path` shutter), the four slices land on its own 2px outline
and are removed once they land, and only the first four children animate, with
`both` fill, so nothing can stay hidden.

## Added scope (2026-11-09)

S5 (user, verbatim): "hay un problema en la versión móvil. Como el fondo, como el
background se adapta, no se alcanza a ver los bloques de la i, por ende se pierden
algunos componentes de poder ser abiertos, no se pueden clicear, no se pueden
tocar. Entonces pensaba dejarlo tal como está, pero cuando se abre el modal, al
modal agregar la opción de llevarte a navegar a otros." — Decision: the mobile crop
stays as it is; the panel gains navigation between works so no piece is the only
door to its own work.

S6 (user, verbatim): "hay que mejorar el diseño del modal que se abre. No está del
todo mal, pero la forma de presentar la información es un poco tosca, no se ve
bien. Aquí ya tenemos que seguir un poco más los patrones de diseño estándar y
necesito que la información, las imágenes estén bien distribuidas."

S7 (user, verbatim): "Respecto a las imágenes, si es necesario modificarlas,
cambiarles tamaño, cambiarles formato, cambiarles recortarlas para que se puedan
ver mejor estéticamente, puedes hacerlo. [...] Si es mejor tenerlas en un formato
WebP, las pasamos todas a WebP solo si es que es necesario."

S8 (user, verbatim): "Puedes cambiar el eslogan de materia en movimiento que dice
ahora a mamá insiste en que deje las interfaces."

Tasks added: T5 the panel layout and its information architecture, T6 navigation
between works inside the panel, T7 the images to WebP, T8 the slogan. T8 is done:
`src/content/site.ts` and the shell in `index.html`. The frozen references under
`web/` and `MIDI/web/` keep the original tagline on purpose.

Image decision: WebP at quality 82, same pixel dimensions, no cropping. The three
photographs are already 3:2 at 1600x1067; the two portrait graphics keep their
ratio and are framed at 3:4 with `object-fit: contain`.


L14 (incident, root cause of the missing images): the dev server on 5173 was a
zombie. `job_stop` did not kill the process tree on Windows, so five Vite servers
had accumulated on 5173 to 5176. Every new `npm run dev --port 5173` silently
drifted to another port while the curls kept hitting the old one, which answered
`200 text/html` for images it never indexed. Killing the five PIDs fixed it; the
dev server now runs with `--strictPort` so a busy port fails loudly instead of
drifting. Lesson: after stopping a dev job, check `netstat -ano | grep 5173`.

L15 (implemented, S5 to S7): the panel is now a work-detail page: header with the
eyebrow and the close button, media in a fixed frame (3:2 cover for photographs,
3:4 contain for the two portrait graphics), then title, ficha tecnica, body and
installations in a second column, and a navigation footer with the counter and
the neighbouring works. ArrowLeft and ArrowRight navigate only while the archive
panel is open and wrap at both ends; switching cross-fades the content in 160ms
without replaying the opening gesture. Images are WebP at quality 82, same pixel
dimensions: 236409 to 159726, 302511 to 131082, 110821 to 56568, 488443 to
342948, 292732 to 186962 bytes.


L16 (mobile-only mapping, S9): the owner reported that on mobile MIDI4all is
unreachable because the pieces that carry it are cropped out, while the horizontal
bar of the white M stays visible and is locked. Measured: the composition is
1200x900 rendered with `slice`; at 390x844 the scale is 0.938 and the visible
x range is about 391 to 809 in composition units. `solid-right` (258-373) and
`solid-cap` (127-372) fall entirely outside it; `solid-dot` (389-1200) keeps the
screen and is about 89 CSS px tall, so it is a real tap target.

Decision: on narrow viewports (the site's only breakpoint, max-width 650px)
`solid-dot` carries card-1 (MIDI4all) and stops being locked; desktop keeps it
locked and keeps card-1 on `solid-left` and `solid-right`. A touch viewport has no
hover, so the overridden piece does not reveal its hover card there: the tap opens
the panel directly, which also avoids a crushed 811x95 card face.


L17 (implemented, S9): `narrowCardOverrides` in `src/content/portfolio.ts` maps
`solid-dot` to `card-1`; `isLockedPiece(piece, narrow)` and `cardForPiece(piece,
narrow)` are the only readers, so the desktop mapping cannot drift. `main.ts`
resolves `matchMedia('(max-width: 650px)')` once, feeds it to the lock, the card
lookup, the labels and the silhouette-mask filter, and re-mounts the hit layer
when the query changes. On narrow viewports `solid-dot` does not reveal the hover
card: with no hover on touch that card would render an 811x95 face, so the tap
opens the panel directly.

Verified by inspection and by `npm run verify` (exit 0): desktop + `solid-dot`
locked with no card; desktop + `solid-left` card-1; narrow + `solid-dot` card-1
with the panel on tap and no hover card; narrow + `solid-left` unchanged.

