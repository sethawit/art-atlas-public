# 24 — Interactive timeline: place/medium filters (Phase 2, Track B)

**What to build:** §3 Phase 2: "interactive historical timelines." Ticket 13's timeline
already groups by century over real `creationDate` data; "interactive" here means real
filters that narrow the underlying query, using data already in the catalogue — the same
`placeOrCulture`/`medium` fields §5's "What else was happening then?" already reads,
generalized from one artwork's page to the whole timeline.

**Blocked by:** none.

**Status:** done

- [x] `getTimeline` takes optional `{ placeOrCulture, medium }` filters, applied to the
      underlying `Artwork`/`PhysicalObject` query — a real narrowing, not a client-side
      re-render over the same unfiltered data
- [x] `getTimelineFilterOptions` — real, distinct place/medium values only (no dead
      dropdown options)
- [x] `/timeline` gets a filter form (GET, URL-preserved like Explore's), a "Clear
      filters" link, and an honest empty state distinct from the unfiltered empty state
      ("no dated artworks in the catalogue yet" vs. "no dated artworks match this filter
      combination")
- [x] Each timeline entry now also shows its real place/culture and medium
- [x] 1 new test (place filter alone, medium filter alone via the "wrong medium" fixture,
      both combined), runId-unique fixture values per the ticket 14/16 postmortem
      discipline. 94 tests total, stable across 3 consecutive runs, typecheck clean
- [x] Verified live: `/timeline?place=France` returns 93 real results vs. 322 unfiltered
      — a genuine narrowing against the real corpus, not a placeholder count
