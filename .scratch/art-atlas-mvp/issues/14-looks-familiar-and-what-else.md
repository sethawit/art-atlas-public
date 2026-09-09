# 14 — Why does this look familiar? + What else was happening then? (§5 closure)

**What to build:** The last two of §5's three "memorable experiences" (the third,
"Compare and understand," partially exists inside the Family Explorer already). Both are
read-only queries over data already in the database — same shape as ticket 13's timeline,
no new data source.

1. "Why does this look familiar?" — four categories, each capped and each explained:
   shares a subject tag, shares a technique/medium, shares a movement, or is a documented
   `Relationship` of type `documented_influence`. §5 also lists a fifth: image/visual
   similarity — deliberately not attempted, since that's real ML infrastructure the
   master prompt itself gates to Phase 3 (§3), not a query over existing data.
2. "What else was happening then?" — other artworks whose preferred `creationDate` falls
   within 25 years of the anchor's, favoring a different `placeOrCulture` than the
   anchor's own so the result reads as "the wider world at that moment," falling back to
   same-culture matches when the window has nothing else. Built on the `placeOrCulture`
   backfill (Met `culture`/department fallback, AIC `place_of_origin`) done for this
   ticket — all 69 artworks re-ingested via `scripts/backfill-place-or-culture.ts`.

**Blocked by:** none.

**Status:** done

- [x] `src/lib/queries/get-looks-familiar.ts` — `findBySubject`, `findByTechnique`,
      `findByMovement`, `findByDocumentedInfluence`, each capped at 6, each entry naming
      the actual shared term/movement rather than a generic "similar" label
- [x] `src/lib/queries/get-what-else-was-happening.ts` — ±25-year window, `placeOrCulture`
      diversity-first sort, capped at 8, honest empty state when the anchor has no dated
      assertion
- [x] Both wired into `/artwork/[slug]` as their own sections, each explicit that a
      pattern match or shared era is not a documented connection (§5's own caution:
      "A machine-detected resemblance is not proof of historical influence")
- [x] `placeOrCulture` added to `Artwork` (migration `add_place_or_culture`), populated
      from Met's `culture` field (falls back to `department` — live-verified `culture` is
      empty even for Islamic Art department objects) and AIC's `place_of_origin`
- [x] Verified live: `/artwork/wheat-field-with-cypresses` shows 6 real subject matches
      (shared "Landscapes" tag) and real contemporaneous works favoring a different
      `placeOrCulture` (Netherlands/France mix) than the anchor's own
- [x] 81 tests passing (10 new: 6 for `get-looks-familiar`, 4 for
      `get-what-else-was-happening`), typecheck clean

**Real bugs caught while building this — a chain of test-isolation issues, all the same
underlying class:** a capped query (`CAP`/`take` + `.slice`) run against a shared,
non-transactional test database lets genuine corpus data or leftover fixtures from
earlier uncleaned test runs crowd out the current run's own fixture before it reaches the
cap, since Postgres doesn't guarantee row order. Hit four times:

1. `findByTechnique`'s test used the literal medium "Oil on canvas" — already shared by
   ~36 real corpus artworks. Fixed with a runId-unique test medium.
2. `Date.now().toString(36)` (millisecond-granularity) run IDs collided across parallel
   vitest workers, causing one file's cleanup to delete another file's still-in-use rows.
   Fixed with `tests/helpers/run-id.ts`'s `newRunId()` (timestamp + random suffix), and
   every test file updated to use it.
3. Making run IDs longer (fix #2) pushed a "no plausible match" search-fuzzy-match test's
   nonsense query into genuine trigram overlap with its own run's fixture title. Fixed by
   not embedding the run ID in that one query string.
4. `findBySubject`'s test used the literal terms "Landscapes"/"Cypresses" — real corpus
   vocabulary — and `get-what-else-was-happening.test.ts` had no `afterAll` cleanup at
   all, so three prior manual runs during development had left ~85 leftover fixture rows
   in the shared test DB, all dated within the same test's own year window, filling the
   cap before the current run's fixtures were reached. Fixed by using runId-unique tag
   terms in `get-looks-familiar.test.ts`, adding `afterAll` cleanup to
   `get-what-else-was-happening.test.ts`, and deleting the accumulated garbage rows by
   hand. Confirmed stable across 3 consecutive full-suite runs after each fix.
