# Art Atlas — Next MVP Plan

Source: `art-atlas-master-prompt.md` + the honest-disclosure gaps recorded in `README.md`'s
Known limitations and Next actions as of ticket 15. Two tracks, in order: finish what
Phase 1 promised before calling it done, then scope Phase 2 ("Deeper discovery", §3) as
its own backlog.

## Track A — Close out Phase 1

Phase 1's own acceptance criteria (§14) and deliverables (§3) aren't fully met yet — this
is the gap between "a real, working slice" (true today) and "the MVP Phase 1 asked for."
Each item below is small enough to ticket now; see `.scratch/art-atlas-mvp/issues/16` on.

| # | Item | Why it's here | Size |
|---|---|---|---|
| 16 | Research + publish more related-piece stories | §3 targets "at least 10 carefully verified" — currently 2 (see README) | Medium — research-then-publish, same process as ticket 09 |
| 17 | Movement/style filter on `/explore` | §6 requires 6 filter dimensions; 5 are built | Small |
| 18 | Corpus growth toward 200–500 | §3's Phase 1 target; pipeline proven, just needs a longer run | Small (mostly wait time — AIC's 60 req/min) |
| 19 | `/admin` authentication | §14: no exposed credentials/unprotected admin in a real MVP | Small–medium |
| 20 | Per-page `generateMetadata` | §13's SEO requirement; only static site-wide metadata exists | Small |
| 21 | Alternate-title field | §6 artwork page explicitly lists it; no field exists anywhere yet | Small — schema + both normalizers + page |
| 22 | Standalone "Compare and understand" tool | §5 — currently only reachable through Family Explorer, capped at 3 | Medium |

Suggested order: 16 and 18 first (both grow the corpus/story count, which also sharpens
"What else was happening then?" per ticket 14's own README note), then 17, 21, 20 (all
small, independent), then 19 before any real deployment, 22 last (biggest UI surface).

## Track B — Phase 2: Deeper discovery (§3)

Phase 2's four named areas, each scoped roughly enough to start a research pass — none of
these should be ticketed in full until that pass happens, per this project's established
"research before build" pattern (ticket 09's related-piece stories, ticket 14's
placeOrCulture backfill).

### B1 — Ownership Journey

§6 "Ownership journey" + §7's location/evidence rules + §10's `OwnershipEvent` and
`Exhibition`/`LoanEvent` entities — all deliberately deferred out of Phase 1 (ticket 13's
file flags this explicitly). Needs:
- Data model: `OwnershipEvent` (owner where publicly documented, date range, evidence
  source) separate from `Exhibition`/`LoanEvent` (institution, dates, evidence source).
- Source research: which of §8's sources actually carry usable provenance —
  Getty Provenance Index most directly, official museum provenance pages otherwise. Not
  a complete live ownership registry (§8's own caveat) — scope expectations accordingly.
- UI: the `Journey` tab already reserved in the artwork-page nav structure (currently
  absent by design), gaps between documented events shown as gaps, never inferred.
- Guardrail from §6: never equate the last recorded auction buyer with a confirmed
  current owner; never disclose a private address; identity only when publicly documented.

### B2 — Location freshness management

§7: "Define a configurable freshness policy rather than inventing universal update
guarantees." Currently `retrievedAt` is stored per-Assertion but nothing acts on it —
no staleness threshold, no "last checked" surfaced to the user beyond the raw timestamp
already shown in Sources. Needs:
- A policy: e.g. display-status/public-access assertions older than N days get a visible
  "may be out of date, check the museum" label (§7 already requires the museum link,
  which exists — this is the missing staleness signal on top of it).
- Decide N per data type — display status and public access change faster than accession
  numbers or dimensions; one global threshold likely wrong.

### B3 — Richer relationship exploration

§12 allows an optional connection graph as long as readable cards/lists convey the same
information without it. Current Family Explorer is grid/comparison/map only (§4's
required three views — already complete for what §4 asks). "Richer" here most plausibly
means: more relationship types actually populated (currently 2 of 9 types have real rows
— `same_series` and `documented_influence`; `preparatory_study`, `pendant_companion`,
`print_impression`, `cast_from_model`, `copy_after` have zero), which is really Track A's
item 16 (more research) continued at larger scale, not new engineering.

### B4 — More collections beyond Met/AIC — done (research), blocked (ingestion)

Ticket 26. Europeana confirmed live to require a registered API key (unlike Met/AIC's
keyless access) — obtaining one needs account creation on Europeana's site, outside what
this agent does on the user's behalf. Endpoints, pagination, and the rights field
(`edm:rights`) are all confirmed and source-registered; a real adapter is ready to build
once the user supplies a key.

### B5 — Interactive historical timeline

§3: "Establish a useful initial timeline in Phase 1 if verified metadata makes it
inexpensive" — done (ticket 13, century buckets). "Interactive" in Phase 2 likely means:
zoom/filter by place or medium on `/timeline` itself (§5's "What else was happening
then?" logic, generalized from a single artwork's page to the timeline view), not a new
data source.

## Sequencing recommendation

Finish Track A (items 16–22) before starting Track B — Phase 2 explicitly builds on a
Phase 1 that meets its own bar (§3's phasing language: "implement in phases," not "start
Phase 2 with Phase 1 half-done"). Within Track A, 16/18 first since they're pure data
work with no new code paths, then the small independent items, then 19 before any public
deployment, then 22.
