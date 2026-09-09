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
dev DB: **64 artworks**, 18 artists, 2 institutions, 4 movements, 2 verified relationships.

| Page | What it does |
|---|---|
| `/` | Hero (real credited artwork), functional search, artist/museum discovery cards |
| `/artwork/<slug>` | Overview, Understand, Related pieces (Family Explorer — grid/comparison/map), Sources, My Art Passport controls |
| `/artist/<slug>` | Parsed bio (nationality/lifespan) where the source gives one, per-work style labels, works list |
| `/movement/<slug>` | Kind (period vs. movement, distinguished), geography/characteristics, associated artists, representative works |
| `/museum/<slug>`, `/city/<slug>` | Real holdings, official visit link, saved-works tie-in |
| `/map` | Real Leaflet map (OpenStreetMap tiles) + accessible institution list |
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
- **Corpus is 64 artworks, not 200–500.** The Phase 1 target assumed more ingestion time
  than this session spent; AIC's 60 req/min rate limit makes a full pull a multi-minute
  job. The pipeline that produced these 64 is real and scales to more with a longer run
  (`npm run ingest:bulk -- 250`, say) — nothing structural blocks it.
  See ticket 05.
- **Related-piece stories: 2 verified, not 10.** Real research (including a dedicated
  background agent covering ~60 of the 64 works) found exactly one more candidate, and
  even that one carries a real evidentiary caveat. The corpus's genuinely documented
  inter-object relationships appear to be rare at this size — hitting 10 needs either a
  larger, more deliberately curated corpus, or a lower evidentiary bar than the master
  prompt sets. See ticket 09's file for the full research log, including everything
  investigated and rejected.
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
- **No Timeline page, no photo identification, no semantic search, no accounts.** All
  explicitly Phase 2/3 in the master prompt, not attempted here.

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

1. Run `npm run ingest:bulk` with a larger target to grow the corpus toward 200–500 —
   the pipeline is proven, this is purely a longer run (respecting AIC's rate limit).
2. Revisit ticket 09 periodically as the corpus grows — a larger, more diverse corpus is
   the real lever for more verified relationships, not more research effort against the
   current 64.
3. Add authentication to `/admin` before any public deployment.
4. Extend ticket 08's movement backfill to Met-sourced works once a suitable Met field
   or a Getty AAT reconciliation pass is chosen (source register flags Getty AAT as an
   enrichment source not yet integrated).
5. Phase 2 per the master prompt: interactive timelines, deeper provenance /
   `OwnershipEvent` + `Exhibition`/`LoanEvent` modeling, `LocationAssertion` freshness
   policy, more collections beyond the Met and AIC.
