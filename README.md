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
npm test           # vitest — 64 tests, run against .env.test's DB
npx tsc --noEmit    # typecheck
```

## What's implemented

Real data throughout — nothing in the running app is placeholder or fabricated. Current
dev DB: **69 artworks**, 18 artists, 2 institutions, 4 movements, 22 verified relationships
(a full Monet "Stacks of Wheat" series clique, 7 works, plus one documented-influence pair).

| Page | What it does |
|---|---|
| `/` | Hero (real credited artwork), functional search, artist/museum discovery cards |
| `/artwork/<slug>` | Overview, Understand, Related pieces (Family Explorer — grid/comparison/map), Where to see it, Sources, My Art Passport controls |
| `/artist/<slug>` | Parsed bio (nationality/lifespan) where the source gives one, per-work style labels, works list |
| `/movement/<slug>` | Kind (period vs. movement, distinguished), geography/characteristics, associated artists, representative works |
| `/museum/<slug>`, `/city/<slug>` | Real holdings, official visit link, saved-works tie-in |
| `/map` | Real Leaflet map (OpenStreetMap tiles) + accessible institution list |
| `/timeline` | Artworks grouped by century from real creationDate data, undated works in their own honest bucket |
| `/explore` | Title/artist search with spelling tolerance, 5 combinable filters, pagination |
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
- **Corpus is 69 artworks, not 200–500.** The Phase 1 target assumed more ingestion time
  than this session spent; AIC's 60 req/min rate limit makes a full pull a multi-minute
  job. The pipeline that produced these 69 is real and scales to more with a longer run
  (`npm run ingest:bulk -- 250`, say) — nothing structural blocks it.
  See ticket 05.
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
- **No "Why does this look familiar?" or "What else was happening then?"** (§5) — two of
  the master prompt's three "memorable experiences." "Compare and understand" exists but
  only inside the Family Explorer (tied to verified relationships, capped at 3 works),
  not as a general-purpose "pick any works and compare" tool. Not yet attempted.
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

1. Build §5's remaining two "memorable experiences" — "Why does this look familiar?"
   (grouped by subject/technique/movement/influence/visual similarity, each explained)
   and "What else was happening then?" (contemporaneous works across regions/traditions,
   explicit about a movement label's geographic scope). Both are read-only queries over
   data already in the database, same shape as ticket 13's timeline.
2. Add per-page `generateMetadata` (title/description/OG per artwork, artist, movement)
   — §13's SEO requirement, currently only a static site-wide title exists.
3. Run `npm run ingest:bulk` with a larger target to grow the corpus toward 200–500 —
   the pipeline is proven, this is purely a longer run (respecting AIC's rate limit). As
   the corpus grows, watch for more known series/companion pieces the way ticket 09's
   Stacks of Wheat expansion did, and publish them the same way.
4. Add authentication to `/admin` before any public deployment.
5. Extend ticket 08's movement backfill to Met-sourced works once a suitable Met field
   or a Getty AAT reconciliation pass is chosen (source register flags Getty AAT as an
   enrichment source not yet integrated).
6. Phase 2 per the master prompt: deeper provenance / `OwnershipEvent` +
   `Exhibition`/`LoanEvent` modeling (the Journey tab), `LocationAssertion` freshness
   policy, more collections beyond the Met and AIC.
