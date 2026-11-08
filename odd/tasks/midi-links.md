# MIDI links

A hidden Linktree of our own, in the MIDI identity, mobile only, reachable only
by typing the URL.

## Specs

S1. In the user's words: "quiero crear el path /midi-links y /midi-links/add...
Estos paths son para recrear una especie de Linktree, pero propio de MIDI."

S2. Access, in the user's words: "Este Linktree y este path solo se va a poder
acceder escribiendo directamente la URL. No va a tener acceso dentro de la
pagina."

S3. Form factor, in the user's words: "va a estar disenado solamente para mobile
version, solo para celular, modo celular."

S4. Editing, in the user's words: "el MIDI Link Add, es para poder agregar links
sin necesidad de crear un CMS."

S5. Aesthetics, in the user's words: "vamos a utilizar la estetica de MIDI que
venimos utilizando."

S6. The open question, in the user's words: "necesitariamos un backend para eso?
podemos agregar un supabase si llega a ser necesario u otro backend para esto.
cual me recomiendas?"

## Decision (recorded, reversible)

No backend for now. The link list lives in the repository and is prerendered at
build time, so `/midi-links` has no runtime dependency and no failure mode. The
write path is the repository itself: GitHub's editor can change one file from a
phone and Vercel rebuilds. Authentication is the owner's GitHub account, so we
implement none.

Rejected for now: Supabase. Ten to fifteen links edited a few times a year do
not justify RLS policies, auth flows and an external service on the one page
built to be shared from social. The rejection is about failure surface, not
about capability.

Reversibility is the deciding property: the page reads from one data module, so
moving to Supabase later replaces the source and touches nothing else.
Supabase becomes correct when a non-Git editor must publish, when per-link click
metrics are wanted, or when scheduling appears.

`/midi-links/add` therefore does NOT save. It is a builder: it validates the
fields, previews the entry, and emits the exact snippet to paste into the data
module. It must say so on screen. Pretending to save would be worse than not
having the page.

## Rules

- `/midi-links` and `/midi-links/add` are not scenes. They are not in the nav,
  not in `sitemap.xml`, not in `llms.txt`, and they carry `noindex, nofollow`.
  A second public page competing with the home would dilute what T5 built.
- Identity only: `#f4f4f4` and `#111111`, DM Mono and Roboto Mono, rectangles,
  no radii, no third colour. Tokens come from `design/system.md`.
- Mobile only by design; it must still not break at desktop widths.

## Tasks

| ID | Specs | What | Route | Commit |
| --- | --- | --- | --- | --- |
| T1 | S1-S3 | Data module plus a second prerender track for non-scene pages, with noindex and exclusion from sitemap and llms.txt | writer | this commit |
| T2 | S4 | `/midi-links/add` builder: validates, previews and emits the snippet; states plainly that it does not save | writer | this commit |
| T3 | S5 | Mobile-first layout in the identity system | writer | this commit |
| T4 | S2, S3 | Checks: both pages exist, both are noindex, neither appears in sitemap, llms.txt or the nav | writer | this commit |

## Log

L1 (user, verbatim): "ademas quiero crear el path /midi-links y /midi-links/add.
Estos paths son para recrear una especie de Linktree, pero propio de MIDI.
Entonces vamos a utilizar la estetica de MIDI que venimos utilizando y vamos a
crear una pagina o un path especifico para crear un Linktree de MIDI. Este
Linktree y este path solo se va a poder acceder escribiendo directamente la URL.
No va a tener acceso dentro de la pagina y va a estar disenado solamente para
mobile version, solo para celular, modo celular. Y el link, el siguiente path, el
MIDI Link Add, es para poder agregar links sin necesidad de crear un CMS.
Entonces ambos URLs solo se va a poder acceder directamente, no van a tener
acceso desde la pagina web."

L2 (user, verbatim): "necesitariamos un backend para eso? podemos agregar un
supabase si llega a ser necesario u otro backend para esto. cual me recomiendas?"

L3 (decision): no backend now, repository as the write path, prerendered read.
Reasons and the reversal condition are in "Decision" above.

L4 (T1-T4, implemented): two independent HTML entries, not scenes, so the
plugin leaves them out of `buildRoutes`, `sitemap.xml` and `llms.txt`, and a
check asserts that exclusion instead of trusting it. Both documents carry
`noindex, nofollow`, because a second public page competing with the home would
dilute what T5 built.

The link list is imported into the bundle and rendered on load: no fetch, no
runtime dependency, nothing that can fail and leave the page blank on the one
page made to be shared from a phone. The trade is that without JavaScript the
page renders empty, which is acceptable for a noindex page on mobile and is
recorded here rather than hidden.

`/midi-links/add` validates, previews and emits the snippet, and says on screen
that it does not save. Publishing is a commit of `src/content/midi-links.ts`.
The three seeded links come from `src/content/site.ts`; nothing was invented.

Verified: `npm run verify` exit 0 with five gates (typecheck, build, routes,
motion, links); both hidden documents exist; noindex present in both; zero
references in the sitemap, `llms.txt` or the site documents; no fetch, no
XMLHttpRequest, no localStorage in `src/links`.

Still needs a real phone: safe-area, legibility, tap targets and the clipboard
permission for the copy button.
