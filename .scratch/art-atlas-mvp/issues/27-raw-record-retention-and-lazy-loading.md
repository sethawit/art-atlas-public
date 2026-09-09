# 27 — Raw source record retention + lazy-loaded galleries (gap closure)

**What to build:** Two real gaps found during a master-prompt comparison pass — not part
of the original backlog.

1. §9 item 2: "Retain permitted raw source records for traceability." `IngestLog` logged
   status/message but never the actual source response — a normalizer bug or a
   since-changed/removed source record had no way to be re-diagnosed or recovered
   without re-fetching (which may no longer even be possible).
2. §13: "lazy-load galleries." No `<img>` in the app used `loading="lazy"` — every list
   page (Explore, Related pieces, Timeline, Compare, artist/museum/city work lists)
   loaded every thumbnail eagerly regardless of scroll position.

**Blocked by:** none.

**Status:** done

- [x] `PhysicalObject.rawRecord` (`Json?`) — the whole raw Met/AIC API response for that
      exact object, as of the most recent ingest. Both APIs are public metadata with
      permitted reuse (source register) — this is the one place the full response is
      kept; normalized fields elsewhere are a derived view.
- [x] `NormalizedArtwork.rawRecord` added; both normalizers (`normalizeMetObject`,
      `normalizeAicArtwork`) set it to the untouched raw object
- [x] `writeNormalizedArtwork` stores it on create and updates it on re-ingest (a stale
      raw record from months ago isn't useful — always reflects the last real sync)
- [x] Re-ran `backfill-place-or-culture.ts` (already re-ingests the whole known corpus)
      to backfill this for real. **Result: 334/334 physical objects now have a real raw
      record**, confirmed live (checked actual field keys on a sample row).
- [x] 1 new test (stores verbatim on create, updates on re-ingest), 121 tests total,
      stable across 3 runs, typecheck clean
- [x] `loading="lazy"` added to every gallery/list `<img>` — Explore results, artwork
      page's Related pieces grid + comparison view + "Why does this look familiar" +
      "What else was happening then", Timeline, Compare, artist/museum/city work lists,
      Passport, city saved-works. Left off the two genuinely singular, above-the-fold
      images (homepage hero, artwork page's own full-view image) — lazy-loading those
      would delay the primary content for no benefit, which isn't what "lazy-load
      galleries" is asking for.
- [x] Verified live: `loading="lazy"` present on real gallery images (Explore results);
      absent from the homepage hero and featured-story images, as intended
