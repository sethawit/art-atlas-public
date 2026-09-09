# 18 — Corpus growth toward 200–500

**What to build:** Run the existing, proven ingestion pipeline at a larger scale. §3's
Phase 1 target is 200–500 verified artworks; current is 69. Nothing structural blocks
this — it's an ingestion-time problem (AIC's 60 req/min rate limit), not a code problem.

**Blocked by:** none.

**Status:** planned

- [ ] `npm run ingest:bulk -- 250` (or similar target), respecting the existing
      rate-limit spacing — expect a genuinely multi-minute run, not a bug if it's slow
- [ ] Spot-check a sample of newly-ingested artworks live (not just trust the exit code) —
      images render, rights/credit populated, placeOrCulture backfilled where the source
      gives it
- [ ] Re-run `movements:normalize` after growth — more AIC-sourced works may carry new
      style text worth normalizing into `MovementStyle` rows
- [ ] Watch for more known series/companion pieces the larger corpus surfaces (ticket 09's
      Stacks-of-Wheat pattern) and flag them for ticket 16
- [ ] Update README's artwork/artist/institution/movement counts once done
- [ ] Check ingest run doesn't introduce new `DuplicateFlag`s that need review, or if it
      does, review them via `/admin` before considering the run "clean"
