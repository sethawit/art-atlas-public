# 08 — Artist pages + movement/style pages

**What to build:** `/artist/<slug>` and `/movement/<slug>` for the Phase 1 corpus. Artist pages carry sourced biography, lifespan where known, places worked, styles with context (never one label applied across an artist's whole multi-period output), selected works, related artists with explicit relationships, and museums holding their documented works. Movement/style pages explain the term, approximate dates and geography, characteristics, representative works, associated artists, and overlapping traditions/predecessor-successor links where supported.

**Blocked by:** 05 — Bulk ingest + admin review workflow

**Status:** ready-for-agent

**Note (ticket 06):** `/artist/<slug>` already exists as a minimal page (`src/app/artist/[slug]/page.tsx`, `src/lib/queries/get-artist-by-slug.ts`) — name, a bio pulled from an artwork-level `artistBio` Assertion, real works list. Extend rather than recreate: still needed here — lifespan, places worked, per-period style context, related artists, and (new) actual `MovementStyle` rows + `ArtworkMovement` links normalized from the `styleTitle`/`subjectTags` Assertions already ingested, so `/movement/<slug>` has real data to read.

- [ ] Artist page renders for every artist in the corpus with at least the required fields populated or explicitly marked unknown
- [ ] A multi-period artist's works show period-appropriate style context, not one blanket label
- [ ] Movement page distinguishes period, movement, technique, and style rather than conflating them
- [ ] Movement page states its geographic/cultural scope explicitly (no implied universal sequence)
- [ ] Both page types link back to real artwork pages
