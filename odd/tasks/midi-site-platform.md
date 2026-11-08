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

S7. The navigation lock, in the user's words: "Hay un error en la primera
transicion, desde la pagina inicio a la pagina portafolio. Cuando se activa la
transicion a traves del click del logo en el inicio o del scroll, avanza
solamente el logo del header, en este caso, junto con el texto, pero no se
realiza la transicion, la transicion principal, y se queda bloqueado. Ya no se
puede ir ni volver. La unica forma es hacerlo a traves de los botones de los
cuadrados de la navegacion abajo."

S8. The transitions do not cover the viewport, in the user's words: "los cambios
transicionales donde se cambia de color el fondo, el background, se cambia el
background solamente en este cuadrado donde se configuro la transicion, pero el
resto del width quedan dos franjas laterales... Hay que considerar la transicion
para el full width y tambien el alto. En la version mobile... las franjas que en
la version escritorio se ven en los laterales... se ven para arriba y para abajo,
para superior e inferior."

S9. New hidden feature, in the user's words: "quiero crear el path /midi-links y
/midi-links/add... para recrear una especie de Linktree, pero propio de MIDI...
Este Linktree y este path solo se va a poder acceder escribiendo directamente la
URL. No va a tener acceso dentro de la pagina y va a estar disenado solamente
para mobile version, solo para celular, modo celular. Y el link, el siguiente
path, el MIDI Link Add, es para poder agregar links sin necesidad de crear un
CMS."

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
| T4 | S3, S1 | One prerendered HTML entry per route; HUD becomes real links; client router replays the transition | parent | this commit |
| T5 | S2 | SEO: per-route title/description, canonical, OG/Twitter, sitemap, robots | writer | this commit |
| T6 | S2 | AEO: JSON-LD (Organization, CollectionPage, BreadcrumbList), semantic headings, `llms.txt` | writer | this commit |
| T7 | S1, S3 | Defect pass: `00 / 03` vs `04` counter, dead `.split` CSS, orphan assets, hit regions derived from data, a11y (`aria-labelledby`, `inert`, real hit labels) | writer | — |
| T8 | S1, S3 | Design polish pass after parity is verified; needs a design brief (gentle-design) | parent | `86e14d0` |
| T9 | S8 | Every generated svg wrapper must declare the same `preserveAspectRatio`; the four transition wrappers currently fall back to the letterboxing default | writer | this commit |
| T10 | S7 | Navigation must not be gated on an animation flag that can stay set: reproduce the 0-to-1 lock headlessly, then fix the state machine | writer | this commit |

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

L8 (T4, RED then GREEN): `scripts/check-routes.mjs` asserts structural invariants
over the built documents — one file per route, unique title, non-empty
description, unique heading, the right `data-scene`, exactly one `aria-current`
on the route's own link, all five nav links present, no hash navigation, and
the counter derived from the route count. It failed first: `contacto` shipped an
empty description because `scene.body?.paragraphs.join(' ')` is `""` and `??`
only falls through on null/undefined. Fixed with an explicit length check plus a
word-boundary truncation. `npm run verify` is the gate: typecheck, build, check,
exit 0.

The route documents are generated from one shell by a `generateBundle` plugin,
so there is no second copy of the markup to keep in sync, and a missing shell
marker throws at build time instead of emitting a silently wrong page. In
development a middleware maps the route paths onto the shell, so `/portafolio/`
renders the same way it will in production.

L9 (T5): the canonical origin is `https://midi4all.art`, set as `DEFAULT_SITE_URL` in `vite.config.ts` and overridable with `SITE_URL`, so
canonical, `og:url`, `sitemap.xml` and the `robots.txt` sitemap line all derive
from one constant. Verified on the real build: five absolute canonicals, a
sitemap with five absolute `<loc>` entries, and `og:title` equal to each
route's `<title>`. `check-routes` now REQUIRES those artifacts, so removing the
origin fails the build check instead of silently dropping them.

The domain came from the owner as "probably" `midi4all.art`. It matches the
`midi4all` handle already used on Instagram and TikTok. It is one constant to
change if it moves.

L10 (T6, RED then GREEN): the body copy was the real gap — it lived only in
`src/content/` and was injected when the dialog opened, so an answer engine saw
a heading and nothing else. The prerendered documents now carry it inside
`#reveal-body` as `<h2>`/`<p>`/`<a>`/`<img>`, with every value escaped. Verified
on the built output: `/nosotros/` ships 3 `<p>`, gallery routes ship their first
`<img>`, `/contacto/` ships its links.

JSON-LD is one `@graph` per document: `WebSite`, `Organization` (email and
`sameAs` taken from the contact links, not invented), the route's own page node
and a `BreadcrumbList`. Page types derive from the data rather than the path:
`CollectionPage` when the scene has a gallery, `AboutPage` when it has
paragraphs, `ContactPage` when its links include a `mailto:`, plain `WebPage`
otherwise. The home route has no breadcrumb, because a one-item breadcrumb is
noise. Each node's `@id` is absolute and cross-referenced.

Two defects the first pass shipped and the gate caught: `llms.txt` was written
with `lines.join('\\n')`, a literal backslash-n, so the whole file was one line;
and its summary concatenated every scene's body into a run-on paragraph. Now it
uses only the collective's own paragraphs, capped on a word boundary.

Known, not blocking: gallery routes prerender all four images and their distinct
alt text inside the hidden reveal body so crawlers and assistive technology can
access the complete gallery. Runtime opening still replaces that body.

L11 (T7 safe subset): gallery items now have distinct, factual Spanish alt text;
route documents prerender every gallery image. Removed only the three `.split`
selectors after searching markup and JS; no `.split` class reference exists.
`#whisper` is a plain hint, not a live region. The SVG hit-region group has an
interaction label and hit targets use the destination scene's `navLabel`. When
the dialog opens, its sibling elements inside `#world` become inert; closing it
restores them before returning focus. The `.split` removal was isolated from
`web/style.css` for parity review.

Two related refactors are deliberately deferred:
- Unifying the palette across `src/motion/*.mjs` would break the byte-identical
  parity proof against `web/` and requires a visual re-verification pass.
- Deriving hit-region geometry from content data risks wrong coordinates: those
  values are tied to the artwork's scale, and misplaced invisible click targets
  have no visual symptom.

The orphan `public/assets/estudio-6.png` and unused logo SVGs are kept on purpose:
they are the collective's brand material, not dead code.

L11 (design): the owner's brief for T8, quoting their own words: the artwork
does not fill the screen, and the type is too small. This ends the parity phase
deliberately — from here the criterion is "better, with the same identity".

The project's design system is now recorded in `design/system.md`, synced from
`src/styles/style.css` and `src/lib/tokens.ts`, with `design/system.html` as the
specimen board. Three directions live in `design/midi-escena-fluida/`:
`01-cover-bleed.html`, `02-fluid-composition.html`, `03-editorial-split.html`.
They differ in structure, not colour. None is implemented yet; the unchosen
two stay as alternatives.

L12 (T8, identity alignment): the identity deck settles the direction question
it was asked to settle. The deck decomposes the isotipo into rectangles and
recomposes it at other scales, and those compositions bleed past the frame, so
boxing the artwork in a 1200x900 canvas with letterbox was an identity
violation rather than a taste question. Direction 03 (editorial split) is
contradicted by the deck, which has no text columns: it has labels and
compositions. The chosen change is therefore the bleed, not a redesign.

Consequences recorded, not hidden:
- The artwork wrapper and `#hit-regions` both use `xMidYMid slice`. They must
  move together or the invisible click targets stop matching the drawing, so
  `check-routes` now reads the value out of `src/motion/motion.mjs` and fails if
  the two drift apart. That check is what makes this safe to change later.
- Under the bleed, pieces cropped outside the frame are no longer clickable. On
  a very tall or very wide viewport a scene could lose every clickable shape.
  Navigation still exists through the HUD, the wheel and the advance button, but
  the "tocá una forma" affordance can go dead on that scene. This needs a human
  look at several aspect ratios; it cannot be proven without a browser.
- The type change follows the deck's own large register (the deck's contact
  line spans the page), not an invented display headline: scene title
  `clamp(32px, 5.5vw, 96px)`, subtitle `clamp(13px, 1.2vw, 17px)`, HUD 11-12px.

L13 (incident, mine, corrected): a `git add -A` while the T8 worker was running
swept its in-progress edits into the brand-material commit, producing a commit
whose message described none of its code. The branch was unpushed, so the
commit was rewritten as two: the brand material and T8 separately. Recorded
because the same mistake is available on every commit made while a worker runs:
stage paths explicitly, never `-A`.

L14 (review budget): the first native review attempt stopped with
`lens_context_budget_exceeded` and created no authority. Cause was mine: the
brand commit had versioned 71 paths, nearly all binary mirrors of twelve marks.
The repository now versions the deck, the usage guide and the twelve vector
sources, and ignores the print, PNG, WebP and favicon mirrors, which stay on
disk. A candidate has to be readable by a reviewer to be reviewable.

L15 (T9/T10, the two production bugs): S8 was my regression. T8 gave
`motion.mjs` `preserveAspectRatio="xMidYMid slice"` and left the four
`transition.mjs` wrappers without the attribute, so they fell back to
`xMidYMid meet` and letterboxed: the resting scene covered, the transitions did
not. All four now declare `slice`. The alternative — stretching the canvases to
fill — is forbidden by the logo guide, which requires the mark's proportions to
be preserved, so the answer is cover-and-crop.

S7 was a state-machine defect, not a drawing defect. `advance()` began with
`if (stopPlayback || !reveal.hidden) return;`, so a playback flag that stayed set
killed the wheel and the artwork click forever while the HUD squares kept
working, because those enter through `navigate()` and never touch the guard. The
fix removes the failure class rather than the symptom: navigation is no longer
gated on the animation at all, `startTransition()` is the single owner of the
in-flight handle, completion is idempotent and cannot be overwritten by a
synchronous settle, and `clearStalledTransition()` recovers a transition that
paints nothing for 1500 ms.

The delegated worker returned this unit half-done: two of four wrappers and no
T10. Finished by hand. Evidence: `tsc --noEmit` exit 0 and
`scripts/check-motion.mjs` asserting 12 renders and 8 directed transitions; that
script fails on the old code at position 1.5, which is the RED proof.

Still needs a browser: the lock was reported, never reproduced headlessly, so
the human check on the live site at 1440x900, 390x844 and 1920x1080 is what
confirms it.
