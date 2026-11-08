# MIDI site platform

Baseline commit `8d04655` (replica of the reference site, verbatim).
Remote: https://github.com/Stefan-migo/midi-web (public, `main`).

## Specs

S1. Visual parity is a hard constraint, in the user's words:
"lo que existe tiene que ser nuestra referencia visual. lo que creemos tiene
que verse exactamente igual visualmente a la referencia."

S2. Professional platform with discoverability, in the user's words:
"Pero tenemos que crearla como una pagina web profesional con capacidad. Con
SEO, AEO."

S3. Improve what exists, give every section a real page, and define its logic:
"hay cosas que mejorar del dise;o e implementar cada pagina y definir una
logica para esta pagina."

S4. Scope of this stage, in the user's words:
"Las 5 secciones actuales, completas y con datos reales"

S5. Replication, done at `8d04655`: "revisa el proyecto y replicalo en este
directorio."

S6. Remote, done: "a partir de este directorio crearemos el github proyect
remoto."

## Architecture decision (recorded, not open)

Vite. Static multi-page prerendered HTML, one real URL per section, vanilla
TypeScript for new code, and the existing SVG motion engine moved
**byte-identical** into `src/motion/` so that visual parity is preserved by
construction and can be diffed against `8d04655`.

Rejected: Astro (its component boundary would wrap an imperative rAF engine and
risk visual drift, violating S1); staying on hash routing (incompatible with
S2 — a hash fragment is not an indexable URL).

Navigation model: each route ships complete HTML for crawlers and answer
engines; after first load a small client router intercepts internal links and
replays the existing `playBetween` transition so the morph survives navigation.
The five HUD squares become real `<a href>` elements.

## Data contract

Both T1 and T2 code against this shape. Do not change it without updating this
document first.

```ts
type SceneId = 'inicio' | 'portafolio' | 'nosotros' | 'contacto' | 'exploraciones';

interface Scene {
  id: SceneId;            // route slug, also the hash legacy alias target
  order: number;          // 0-based, drives the counter and the motion budget
  navLabel: string;       // accessible name for the HUD square
  title: string;          // scene headline
  subtitle: string;       // scene kicker
  /** Optional because scenes 0 and 4 render artwork only. */
  body?: {
    heading: string;
    paragraphs: string[]; // plain text, no markup
    links?: { label: string; href: string; kind: 'mailto' | 'social' }[];
  };
  gallery?: { src: string; alt: string; title?: string; year?: string }[];
}

interface Site {
  name: string;
  tagline?: string;       // no sourced value yet; never invent one
  hint?: string;          // the `#whisper` HUD text, `web/index.html:12`
  scenes: Scene[];
}
```

Rules:

- Content is data. No copy may live inside a render function.
- `src/content/` is the only writable home of copy, links, gallery entries and
  project metadata.
- Motion frame budgets stay in the motion module, never in content.

## Delivery slices

- Slice 1 (`0267c7e`) is **948 authored lines** and exceeds the ~400-line
  guidance. It was not split because the port is atomic: `src/main.ts` imports
  `src/content/`, `tsconfig` covers both, and `index.html` loads the entry, so
  any split produces a commit that does not build or typecheck. Splitting it
  would trade reviewability for a broken bisect. Recorded here, not hidden.
- Slice 2 (T3) is the deduplication and documentation unit.
- Slice 3 starts at T4. It should stay under the slice limit.

`web/` is NOT deleted by T3. It is the live comparison target while S1 is
validated, so removing it now would destroy the evidence. It is removed in the
cleanup task once the visual sign-off lands.

## Tasks

| ID | Specs | What | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S2, S1 | Vite MPA scaffold, design tokens, `src/motion/` byte-identical move, root route entry | writer | `0267c7e` |
| T2 | S4, S3 | `src/content/` data layer from the reference copy plus the abandoned Next components | writer | `0267c7e` |
| T3 | S1, S2 | Remotion consumes `src/motion/`; the hand-maintained duplicates in `remotion/public/` are gone | parent | this commit |
| T4 | S3, S1 | One prerendered HTML entry per route; HUD becomes real links; client router replays the transition | parent | — |
| T5 | S2 | SEO: per-route title/description, canonical, OG/Twitter, sitemap, robots | writer | — |
| T6 | S2 | AEO: JSON-LD (Organization, CollectionPage, BreadcrumbList), semantic headings, `llms.txt` | writer | — |
| T7 | S1, S3 | Defect pass: `00 / 03` vs `04` counter, dead `.split` CSS, orphan assets, hit regions derived from data, a11y (`aria-labelledby`, `inert`, real hit labels) | writer | — |
| T8 | S1, S3 | Design polish pass after parity is verified; needs a design brief (gentle-design) | parent | — |

## Log

L1 (user, verbatim): "hey chat vamos a iniciar un nuevo proyecto. vamos a
trabajar en la pagina web para MIDI. un colectivo artistico. yatenemos una
referencia de pagina web bastante bien elaborada. pero hay cosas que mejorar
del dise;o e implementar cada pagina y definir una logica para esta pagina.
E:\Proyectos\midiWeb\MIDI revisa el proyecto y replicalo en este directorio. a
partir de este directorio crearemos el github proyect remoto."

L2 (user, decisions): architecture — "Cual vendria siendo la mejor opcion aqui.
efectivamente el idea es mejorar lo que ya existe. lo que existe tiene que ser
nuestra referencia visual. lo que creemos tiene que verse exactamente igual
visualemente a la referencia. Pero tenemos que crearla como una pagina web
profesional con capacidad. Con SEO, AEO." Scope — "Las 5 secciones actuales,
completas y con datos reales". Remote — "Commit local y después repo público en
tu cuenta."

L3 (decision): Vite MPA over Astro and over hash routing. Reason recorded in
"Architecture decision" above. One repository per site; the abandoned Next.js
scaffold in `midi-webpage` stays historical and is read only as a copy source.

L4 (evidence): baseline replica verified byte-identical (`web/`, `remotion/`,
`README.md`); committed as `8d04655`; pushed to public `Stefan-migo/midi-web`.

L5 (evidence): the reference is a single document with five hash scenes, not a
multi-page site. Its ten concrete defects are recorded in the exploration map
and are tracked by T7.

L6 (evidence, T1+T2+T3): `tsc --noEmit` exit 0, `vite build` exit 0 (20.48 kB
JS). Parity verified independently of the worker reports: the four motion
modules are byte-identical to `web/` by md5, `public/assets/` is identical to
`web/assets/` by recursive diff, and `src/styles/style.css` is byte-identical
to `web/style.css` with **zero diff lines**. Both servers respond and every
module in the import graph returns 200, which rules out the blank-page class of
failure.

L7 (decisions and defects found during integration, none reported by a worker):
- `src/main.ts` shipped with `// @ts-nocheck`, which silently disabled the only
  control gate this step had. It was hiding four real errors. Removed; the
  engine is typed under `strict` + `noUncheckedIndexedAccess` instead, and
  `allowJs` lets the byte-identical `.mjs` modules keep their own types.
- The two parallel deliveries collided: T2 put `↗` inside every link label and
  `main.ts` appended another one, so the links would render `↗ ↗`. Labels now
  carry text only and the renderer owns the glyph.
- T2 found real UI copy the data contract had no field for: the `#whisper` hint
  `tocá una forma` (`web/index.html:12`). Dropping it would have been a visible
  regression. Added as `Site.hint`; `Site.tagline` became optional because no
  sourced value exists and inventing one is not allowed.
- No test drives this port red/green: it is a scaffold plus a byte-identical
  move, so there is no behavior change to pin. Parity is the check, and it is
  byte- and hash-level.
- Open, tracked by T7: the four gallery items share one identical `alt` string,
  so a screen reader user cannot tell them apart.
