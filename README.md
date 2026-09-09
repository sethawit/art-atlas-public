# Art Atlas

Discover an artwork. Understand its connections. Find where to see it.

A Phase 1 MVP built against the master prompt at `art-atlas-master-prompt.md`. Product
definition, sitemap, and the full backlog live in `docs/superpowers/specs/` and
`.scratch/art-atlas-mvp/issues/`; this file is the handoff (§16 item 10 of the master
prompt): setup, what's implemented, what's known-incomplete, and what's next.

## Setup

Requires Node 24+, Docker (for local Postgres), and no other accounts or API keys — the
Met and AIC APIs are both public/keyless.

```bash
npm install
docker compose up -d                        # starts Postgres 16 on localhost:5432
cp .env.example .env
cp .env.test.example .env.test               # separate DB so tests never touch dev data

# create the two databases inside the container (docker-compose only auto-creates the
# first; this is a one-time manual step, not automated — see Known limitations)
docker compose exec postgres psql -U art_atlas -d postgres -c "CREATE DATABASE art_atlas_test OWNER art_atlas;"

npx prisma migrate deploy                                                        # dev DB
DATABASE_URL="$(grep DATABASE_URL .env.test | cut -d= -f2- | tr -d '"')" \
  npx prisma migrate deploy                                                      # test DB

npm run dev                                  # http://localhost:3001 (3000 often taken)
```

Seed real data (all idempotent — safe to re-run):

```bash
npm run ingest:met -- 436535        # one real Met artwork by objectID (proves the adapter)
npm run ingest:aic -- 28560         # one real AIC artwork by id
npm run ingest:bulk -- 30           # bulk pull, ~30 per source across curated search terms
npm run movements:normalize         # backfill MovementStyle from ingested style text
npm run relationships:publish       # publish the hand-verified Family Explorer relationships
```

```bash
npm test           # vitest — 81 tests, run against .env.test's DB
npx tsc --noEmit    # typecheck
```

## What's implemented

Real data throughout — nothing in the running app is placeholder or fabricated. Current
dev DB: **334 artworks**, 177 artists, 2 institutions, 33 movements, 37 verified relationships
across **7 distinct related-piece stories** — a full Monet "Stacks of Wheat" clique (7
works), one documented-influence pair, and five real Hokusai/Hiroshige ukiyo-e print
series found after ticket 18's corpus growth (ticket 16) — still short of §3's "at least
10" Phase 1 launch target; disclosed here per the master prompt's own instruction to
report a shortfall honestly rather than let the relationship-row count read as more
stories than it is.

| Page | What it does |
|---|---|
| `/` | Hero (real credited artwork), functional search, a real featured related-piece story, artist/museum/style discovery cards |
| `/artwork/<slug>` | Overview, Understand, Related pieces (Family Explorer — grid/comparison/map), Why does this look familiar? (subject/technique/movement/documented-influence pattern matches), What else was happening then? (contemporaneous works, favoring a different place/culture), Where to see it, Sources, My Art Passport controls |
| `/artist/<slug>` | Parsed bio (nationality/lifespan) where the source gives one, per-work style labels, works list |
| `/movement/<slug>` | Kind (period vs. movement, distinguished), geography/characteristics, associated artists, representative works |
| `/museum/<slug>`, `/city/<slug>` | Real holdings, official visit link, saved-works tie-in |
| `/map` | Real Leaflet map (OpenStreetMap tiles) + accessible institution list |
| `/timeline` | Artworks grouped by century from real creationDate data, undated works in their own honest bucket |
| `/explore` | Title/artist search with spelling tolerance, 6 combinable filters, pagination |
| `/passport` | Local-only saved lists (want to see / seen / want to understand), private notes, filters |
| `/admin` | Duplicate-flag review, per-artwork assertion approval, image removal — **unauthenticated, see below** |

Ingestion: adapters for the Met Collection API and AIC API, source-register-verified
(`docs/sources/source-register.md`), idempotent bulk pipeline with retry and rate-limit
spacing, sync logging (`IngestLog`), and duplicate-safe writes (two different physical
objects sharing a title-slug get a disambiguated second `Artwork` + a `DuplicateFlag`,
never a silent merge — see ADR 0001 and ticket 05's file for the bug this fixed).

Design: a real stylesheet (ticket 12) — warm off-white background, restrained teal
accent, Libre Franklin (navigation/labels) + Source Serif 4 (reading content), WCAG
AA-passing contrast, visible keyboard focus everywhere, mobile-safe comparison table,
real loading/error/not-found states.

## Known limitations

Recorded honestly rather than hidden — each of these is a deliberate scope decision, not
an oversight, and each is written up in more detail in its ticket file under
`.scratch/art-atlas-mvp/issues/`.

- **`/admin` has no authentication.** Anyone who can reach it can approve assertions,
  remove images, or resolve duplicate flags. A visible banner says so on every admin
  page. Do not deploy publicly without adding access control first.
- **Corpus is now 334 artworks, within §3's 200–500 target** (ticket 18) — up from the
  original 69 via a larger `ingest:bulk` run across more search terms. 82 Met-side
  ingests failed with `403` during the run (logged in `IngestLog`, not silently dropped)
  — the Met's advisory 80 req/s limit was likely exceeded by the burst; not retried since
  the target was already comfortably met. 26 pending `DuplicateFlag`s from generic shared
  titles ("Self-Portrait," "Still Life," "Fragment," different artists) were spot-checked
  and are legitimate flags, not bugs — including three real, distinct AIC print
  impressions of Hokusai's "Great Wave" correctly kept as separate `PhysicalObject`s
  rather than merged. Editorial resolution of the 26 flags is `/admin` work, not done
  here. See ticket 05 (original pipeline) and ticket 18 (this growth run).
- **Movement/style data is AIC-only.** The Met doesn't provide an equivalent field in
  what we ingest, so Met-only artists (most of the Old Masters in the corpus) show no
  style. Not fabricated — genuinely absent from the source.
  See ticket 08.
- **Artist "places worked" and "related artists" are unimplemented, not faked.** No
  source we ingest gives structured place-of-work data, and no artist-to-artist
  relationship has been verified to the same evidentiary bar ticket 09 set for artwork
  relationships.
- **No hours, ticket prices, or current exhibitions anywhere.** The master prompt
  requires these to carry a source and freshness label or be omitted; we have no such
  source, so they're omitted, with an on-page link to each museum's own visit page
  instead. See ticket 10.
- **`art_atlas_test` database creation is a manual setup step**, not automated via
  `docker-compose.yml` (which only auto-creates the first DB via `POSTGRES_DB`). See
  Setup above.
- **No photo identification, semantic search, or accounts.** Explicitly Phase 2/3 in the
  master prompt, not attempted here. (Timeline exists — see the feature table above;
  added in ticket 13 after a fresh master-prompt-vs-implementation pass found it missing.)
- **"Compare and understand" only exists inside the Family Explorer** (tied to verified
  relationships, capped at 3 works), not as a general-purpose "pick any works and
  compare" tool. The other two §5 "memorable experiences" — "Why does this look
  familiar?" (subject/technique/movement/documented-influence, each labeled a pattern
  match, not a documented connection) and "What else was happening then?" (a ±25-year
  window over creationDate, favoring a different `placeOrCulture` than the anchor) — are
  now built, on every artwork page. "Visual similarity" (image-embedding resemblance) is
  the one sub-case of "looks familiar" deliberately not attempted — real ML
  infrastructure the master prompt itself gates to Phase 3 (§3), not a query over
  existing data the way the other four categories are.
- **No per-page SEO metadata.** Every page shares the root layout's static title/
  description — §13 asks for "meaningful metadata" per detail page (dynamic Next.js
  `generateMetadata`), not implemented.
- **No alternate-title data.** §6 asks for "title/alternate titles" on the artwork page;
  no alt-title field exists anywhere in the data model or either source adapter.
- **`ImageAsset.eligibleUses` is a dead column.** In the schema, never populated by
  either normalizer.
- **Journey (ownership/provenance) stays deferred**, per §3's own phase gating —
  "publicly documented provenance" is explicitly Phase 2 — even though §6 lists it as
  one of the artwork page's six tabs without a phase caveat there. A deliberate reading
  of §3 over §6's literal tab list, not an oversight; flagged here so it's a visible
  choice, not a silent gap.

## Source coverage

Both Phase 1 sources verified against live official documentation, not assumed —
`docs/sources/source-register.md` has full detail including gotchas (image-eligibility
gates, an imminent Met API deprecation, AIC's hard rate limit). Both APIs are public,
keyless, and confirmed to give unrestricted metadata access for cataloguing use; image
reuse is gated per-object (`isPublicDomain` / `is_public_domain`), and both eligibility
flags are honored end-to-end in this app — an ineligible image is never rendered, and the
artwork page falls back to an explicit "unavailable" state instead.

## Next actions

In rough priority order for continuing this backlog:

1. Add per-page `generateMetadata` (title/description/OG per artwork, artist, movement)
   — §13's SEO requirement, currently only a static site-wide title exists.
2. Research and publish more related-piece stories toward §3's "at least 10" target —
   currently 7 (see Known limitations). Same research-then-publish process as ticket 09/16.
3. Review the 26 pending `DuplicateFlag`s from the ticket 18 growth run via `/admin`.
4. Add authentication to `/admin` before any public deployment.
5. Build a general-purpose "Compare and understand" tool (pick any two works, not just
   ones already linked by a verified relationship) — the last unbuilt piece of §5.
6. Extend ticket 08's movement backfill to Met-sourced works once a suitable Met field
   or a Getty AAT reconciliation pass is chosen (source register flags Getty AAT as an
   enrichment source not yet integrated).
7. Phase 2 per the master prompt: deeper provenance / `OwnershipEvent` +
   `Exhibition`/`LoanEvent` modeling (the Journey tab), `LocationAssertion` freshness
   policy, more collections beyond the Met and AIC.
