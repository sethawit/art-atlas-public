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
docker compose up -d                        # starts Postgres 16, creates both DBs (ticket 29)
cp .env.example .env
cp .env.test.example .env.test               # separate DB so tests never touch dev data
# set ADMIN_PASSWORD in .env — /admin is unreachable without it (ticket 19)

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
npm run refresh:location            # refresh display status/gallery location only (ticket 29, §9 item 9)
```

```bash
npm test           # vitest — 130 tests, run against .env.test's DB
npx tsc --noEmit    # typecheck
```

## What's implemented

Real data throughout — nothing in the running app is placeholder or fabricated. Current
dev DB: **334 artworks**, 177 artists, 2 institutions, 33 movements, 38 verified relationships
across **8 distinct related-piece stories** — a full Monet "Stacks of Wheat" clique (7
works), one documented-influence pair, five real Hokusai/Hiroshige ukiyo-e print series,
and one Met-held pendant pair (ticket 16, after ticket 18's corpus growth) — still short
of §3's "at least 10" Phase 1 launch target despite a real, thorough search (title-text
patterns beyond series membership, plus reading actual AIC curatorial description text
for connections not visible in titles at all); disclosed here per the master prompt's own
instruction to report a shortfall honestly rather than let the relationship-row count
read as more stories than it is. 884 real `OwnershipEvent` + 1,772 real `ExhibitionEvent`
rows (ticket 25) across 208/264 AIC-sourced physical objects. 668 real `LocationAssertion`
rows (ticket 28) — 100% coverage, every physical object. **154/334 physical objects
(46%) now have a real, evidence-based `on_display` status** (ticket 29) from a real
gallery location — up from every object defaulting to `"unconfirmed"`.

| Page | What it does |
|---|---|
| `/` | Hero (real credited artwork), functional search, a real featured related-piece story, artist/museum/style discovery cards |
| `/artwork/<slug>` | Overview, Understand, Related pieces (Family Explorer — grid/comparison/map), Why does this look familiar? (subject/technique/movement/documented-influence pattern matches), What else was happening then? (contemporaneous works, favoring a different place/culture), Where to see it (real sourced statement + verification status per field, freshness note when stale), Journey (real ownership/exhibition history where documented), Sources, My Art Passport controls |
| `/artist/<slug>` | Parsed bio (nationality/lifespan) where the source gives one, per-work style labels, works list |
| `/movement/<slug>` | Kind (period vs. movement, distinguished), geography/characteristics, associated artists, representative works |
| `/museum/<slug>`, `/city/<slug>` | Real holdings with real gallery location where the source gives one (ticket 29), official visit link, saved-works tie-in |
| `/map` | Real Leaflet map (OpenStreetMap tiles) + accessible institution list |
| `/timeline` | Artworks grouped by century from real creationDate data, undated works in their own honest bucket, filterable by real place/culture and medium |
| `/explore` | Title/artist/subject search with spelling tolerance, 6 combinable filters, pagination, select works to compare |
| `/compare` | Compare 2–4 works of any kind side by side — images, dates, medium, dimensions, collections, any documented relationship between them, and real computed differences |
| `/passport` | Local-only saved lists (want to see / seen / want to understand), private notes, filters |
| `/admin` | Duplicate-flag review, per-artwork assertion approval, image removal, relationship review, Journey (ownership/exhibition) review — HTTP Basic Auth protected (`ADMIN_PASSWORD`, ticket 19) |

Ingestion: adapters for the Met Collection API and AIC API, source-register-verified
(`docs/sources/source-register.md`), idempotent bulk pipeline with retry and rate-limit
spacing, sync logging (`IngestLog`), raw source record retention (`PhysicalObject.rawRecord`
— the full Met/AIC API response, real on all 334 physical objects, ticket 27), and
duplicate-safe writes (two different physical objects sharing a title-slug get a
disambiguated second `Artwork` + a `DuplicateFlag`, never a silent merge — see ADR 0001
and ticket 05's file for the bug this fixed).

Design: a full visual redesign (ticket 30) — an atlas/gazetteer identity grounded in what
the app actually tracks (a work's place and journey, not just its picture): chart-paper
background, a single cartographer's-ink blue accent, ruled "plate" borders around
documented images, index-card grids for work lists, and never-color-alone status tags for
display/verification state. Fraunces (titles/structure) + Newsreader (reading content).
WCAG AA-passing contrast, visible keyboard focus everywhere, mobile-safe comparison table,
real loading/error/not-found states, lazy-loaded gallery images (ticket 27) on every
list/grid page.

## Known limitations

Recorded honestly rather than hidden — each of these is a deliberate scope decision, not
an oversight, and each is written up in more detail in its ticket file under
`.scratch/art-atlas-mvp/issues/`.

- **Corpus is now 334 artworks, within §3's 200–500 target** (ticket 18) — up from the
  original 69 via a larger `ingest:bulk` run across more search terms. 82 Met-side
  ingests failed with `403` during the run (logged in `IngestLog`, not silently dropped)
  — the Met's advisory 80 req/s limit was likely exceeded by the burst; not retried since
  the target was already comfortably met. 26 `DuplicateFlag`s from generic shared titles
  ("Self-Portrait," "Still Life," "Fragment," different artists) were reviewed — each has
  a distinct `externalRecordUrl` (a genuinely separate object, not the same record
  ingested twice), including three real, distinct AIC print impressions of Hokusai's
  "Great Wave" correctly kept as separate `PhysicalObject`s rather than merged. All 26
  resolved `confirmed_distinct`. See ticket 05 (original pipeline) and ticket 18 (this
  growth run).
- **Movement/style data is AIC-only — confirmed, not just unattempted.** Checked live
  against the Met API on 4 major paintings (including 3 Van Goghs): `period` is empty,
  `classification`/`objectName` are medium categories ("Paintings", "Painting"), not
  movement/style — no field there plays AIC `style_title`'s role. `dynasty`/`period` do
  carry real data for ancient/non-Western departments, but that's period-of-origin
  territory `placeOrCulture`/`department` already covers, not a movement label. The real
  path forward is a Getty AAT reconciliation pass (§8) — real scope (a new enrichment
  source, entity reconciliation, not a field-mapping tweak), correctly left to Phase 2
  rather than forced in here. See ticket 08.
- **Artist "places worked" and "related artists" are unimplemented, not faked.** No
  source we ingest gives structured place-of-work data, and no artist-to-artist
  relationship has been verified to the same evidentiary bar ticket 09 set for artwork
  relationships.
- **No hours, ticket prices, or current exhibitions anywhere.** The master prompt
  requires these to carry a source and freshness label or be omitted; we have no such
  source, so they're omitted, with an on-page link to each museum's own visit page
  instead. See ticket 10.
- **No photo identification, semantic search, or accounts.** Explicitly Phase 2/3 in the
  master prompt, not attempted here. (Timeline exists — see the feature table above;
  added in ticket 13 after a fresh master-prompt-vs-implementation pass found it missing.)
- **All three §5 "memorable experiences" are now built.** "Why does this look
  familiar?" (subject/technique/movement/documented-influence, each labeled a pattern
  match, not a documented connection), "What else was happening then?" (a ±25-year
  window over creationDate, favoring a different `placeOrCulture` than the anchor), and
  "Compare and understand" (`/compare`, any 2–4 works, not just verified-related ones —
  ticket 22). "Visual similarity" (image-embedding resemblance) is the one sub-case of
  "looks familiar" deliberately not attempted — real ML infrastructure the master prompt
  itself gates to Phase 3 (§3), not a query over existing data the way the other four
  categories are.
- **No alternate-title data — confirmed absent from both sources, not unbuilt.** §6 asks
  for "title/alternate titles" on the artwork page. The Met API has no such field at all
  (checked its full live response schema). AIC's API does have an `alt_titles` field, but
  it was `null` on all 106 real objects sampled while checking (ticket 21) — present in
  the schema, unpopulated in practice. No field was added to the data model rather than
  ship a column that would never display anything.
- **`ImageAsset.eligibleUses` is a dead column.** In the schema, never populated by
  either normalizer.
- **Journey (ownership/provenance) date-range/gap presentation isn't attempted.** The
  tab itself is now built (ticket 25) from real AIC provenance/exhibition text, but §6's
  "present missing intervals as gaps" needs clean date ranges per owner — extracting
  those reliably from free-form prose (rather than just preserving the source's own
  segment order, which is what's built) is real additional parsing risk not taken on
  here. Loan-specific events (distinct from exhibitions) also aren't populated — no
  source here gives structured loan data.

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

1. Research and publish more related-piece stories toward §3's "at least 10" target —
   currently 8 (see Known limitations). Same research-then-publish process as ticket 09/16
   — a thorough pass already ran (title patterns + AIC description text); the remaining 2
   likely need either real corpus growth toward a known series/pair not yet ingested, or
   research into other artists' documented connections beyond Monet/Hokusai/Hiroshige.
2. Phase 2 per the master prompt (started — see below): deeper provenance /
   `OwnershipEvent` + `Exhibition`/`LoanEvent` modeling (the Journey tab), more
   collections beyond the Met and AIC, and a Getty AAT reconciliation pass (the confirmed
   real path to Met-sourced movement/style data — see Known limitations).

## Phase 2 progress (Track B)

Phase 2 per the master prompt's own scope (§3: "Add interactive historical timelines,
richer relationship exploration, publicly documented provenance, more collections, and
location freshness management"). Plan: `docs/superpowers/specs/2026-09-09-art-atlas-phase2-plan.md`.

- **Location freshness policy** (ticket 23) — done. `displayStatus`/`publicAccess` are the
  fields most likely to go stale (no live feed from either source); a visible note now
  appears on the artwork page when a `PhysicalObject` hasn't been reverified against its
  source in 180+ days, naming the actual last-checked date. Verified live by temporarily
  backdating a real record, confirming the note rendered, then restoring the original
  timestamp.
- **Interactive timeline** (ticket 24) — done. `/timeline` now has real place/culture and
  medium filters, generalizing §5's "What else was happening then?" fields from one
  artwork to the whole timeline — a genuine narrowing of the underlying query, verified
  live (`?place=France` returns 93 of 322 total dated works).
- **Ownership Journey** (ticket 25) — done for ownership + exhibitions. AIC's API turns
  out to have real `provenance_text`/`exhibition_history` fields (confirmed live, Met has
  neither) — genuine museum-published scholarly provenance research, not placeholder
  data. Deliberately not parsed into structured owner-name/date fields (the prose
  distinguishes an agent from an owner in ways a generic parser risks misattributing);
  instead the source's own text is split into discrete, ordered segments and shown
  verbatim. 208/264 AIC-sourced physical objects (79%) ended up with real ownership data
  after backfilling the existing corpus. Loan-specific events and date-range/gap
  presentation aren't attempted — see Known limitations. Has an admin review gate
  (`/admin/journey`) — a segment defaults to visible (real museum text, not a fabricated
  claim) but an admin can flag one found to be wrong to hide it from the public page.
- **More collections (Europeana)** (ticket 26) — research done, ingestion genuinely
  blocked. Verified live that Europeana's Search API requires a registered API key
  (unauthenticated calls return a real `invalid_apikey` error) — a material difference
  from the Met/AIC's fully keyless access. Obtaining a key requires account creation on
  Europeana's site, which is outside what gets done on the user's behalf without them
  doing it directly — a real operating constraint, not a research shortfall. Endpoints,
  pagination (cursor-based beyond 1,000 results), and the item-level rights field
  (`edm:rights`) are all confirmed and documented in the source register, ready for a
  real adapter if the user provides a key.
