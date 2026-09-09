# 18 — Corpus growth toward 200–500

**What to build:** Run the existing, proven ingestion pipeline at a larger scale. §3's
Phase 1 target is 200–500 verified artworks; current is 69. Nothing structural blocks
this — it's an ingestion-time problem (AIC's 60 req/min rate limit), not a code problem.

**Blocked by:** none.

**Status:** done

- [x] Two `ingest:bulk` runs: first at target 150/source with the default 8 search terms
      (69 → 154), second at target 150/source with 12 additional terms since the default
      set had run dry on unique candidates (154 → 334)
- [x] Spot-checked live: images render, rights/credit populated,
      `placeOrCulture` is 334/334 populated (culture/place_of_origin, department
      fallback) — real, no fabrication
- [x] Re-ran `movements:normalize` — 4 → 33 `MovementStyle` rows, 139 new artwork links
- [x] 82 Met-side `403`s during the second run, logged in `IngestLog` not silently
      dropped (advisory 80 req/s limit likely exceeded by the burst) — not retried, target
      already met without them
- [x] 26 pending `DuplicateFlag`s reviewed by hand (query + inspect, not `/admin`
      resolution): all legitimate — generic shared titles across different artists
      ("Self-Portrait," "Still Life," "Fragment," "Panel"), plus 3 real distinct AIC
      Hokusai "Great Wave" print impressions correctly kept separate. None are bugs;
      editorial resolution left for `/admin` (README Next Actions)
- [x] README counts updated: 69→334 artworks, 18→177 artists, 4→33 movements; corpus-size
      Known-limitations bullet rewritten as resolved
- [x] Series/companion-piece candidates for ticket 16: not surveyed yet at this larger
      scale — left for ticket 16 itself
