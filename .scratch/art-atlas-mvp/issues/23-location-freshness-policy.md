# 23 — Location freshness policy (Phase 2, Track B)

**What to build:** §7: "Define a configurable freshness policy rather than inventing
universal update guarantees." `retrievedAt` exists per Assertion, but nothing acted on
it — no staleness threshold, no visible "may be out of date" signal beyond the raw
timestamp already shown in Sources.

**Blocked by:** none.

**Status:** done

- [x] `src/lib/institutions/freshness.ts` — `DISPLAY_STATUS_FRESHNESS_DAYS` (180, named
      and documented, not claimed universal), `isDisplayStatusStale(lastVerified)`
- [x] Scoped to `displayStatus`/`publicAccess` specifically, not every field — these are
      set once at ingest with no live feed from either source, and are the ones most
      likely to actually go stale (an accession number or medium doesn't change)
- [x] `PhysicalObject.updatedAt` used as the "last verified against source" signal — real,
      not invented: `write-normalized-artwork.ts` touches every `PhysicalObject` field on
      each re-ingest, so `updatedAt` reflects the last real sync with the Met/AIC API
- [x] Wired into the artwork page's "Where to see it" section: a visible note when stale,
      naming the actual last-checked date, alongside the existing official-visit link
- [x] 5 new unit tests (`daysSince`, `isDisplayStatusStale` — boundary just-under/
      just-over, same-instant case), 93 total, typecheck clean
- [x] Verified live end-to-end: backdated one real `PhysicalObject.updatedAt` 200 days via
      raw SQL, confirmed the note rendered with the correct date, restored the original
      timestamp exactly afterward (verified restored value matches). Confirmed the note
      is correctly absent for the corpus's actual (freshly-ingested) data.
