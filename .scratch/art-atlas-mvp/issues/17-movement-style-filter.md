# 17 — Movement/style filter on Explore

**What to build:** The 6th of §6's required Explore filters — filter results by
`MovementStyle`, combinable with the existing 5 (date range, medium, museum, city,
display status).

**Blocked by:** none.

**Status:** done

- [x] Added `movementSlug` to `SearchFilters`, joined through `ArtworkMovement` in the
      `where` clause (`src/lib/queries/search-artworks.ts`)
- [x] `getFilterOptions` now also returns real `MovementStyle` rows (only ones with at
      least one linked artwork — no dead filter options)
- [x] `<select>` added to the Explore form; `buildQueryString` already handled the new
      `movement` param generically, no change needed there
- [x] Tests: movement filter alone, and combined with medium (both a match and a
      non-match) — used a runId-unique `test-movement-${runId}` fixture rather than a
      real movement name, per ticket 14's postmortem. 2 new tests, 83 total, stable
      across 3 consecutive runs
- [x] Verified live: `/explore?movement=impressionism` returns 38 real results
- [x] Removed the "coming soon" note from the Explore page and the matching README bullet
