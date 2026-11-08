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
```

Rules:

- Content is data. No copy may live inside a render function.
- `src/content/` is the only writable home of copy, links, gallery entries and
  project metadata.
- Motion frame budgets stay in the motion module, never in content.

## Tasks

| ID | Specs | What | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S2, S1 | Vite MPA scaffold, design tokens, `src/motion/` byte-identical move, root route entry | writer | — |
| T2 | S4, S3 | `src/content/` data layer from the reference copy plus the abandoned Next components | writer | — |
| T3 | S1, S2 | Remotion consumes `src/motion/`; delete the duplicated `web/*.mjs` copies | parent | — |
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
