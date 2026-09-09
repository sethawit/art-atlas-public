# 20 — Per-page SEO metadata

**What to build:** §13: "Render public detail pages in a search-engine-friendly way, with
stable canonical URLs and meaningful metadata." Canonical URLs already exist (slug-based,
stable). Metadata is currently one static site-wide title/description from the root
layout — no per-page `generateMetadata`.

**Blocked by:** none.

**Status:** done

- [x] Root layout gets a `title.template` ("%s — Art Atlas") so every page's own title
      composes cleanly with the site name
- [x] `generateMetadata` on `/artwork/[slug]`: title (artwork + artist), description
      (title/artist/date/institution, all real fields, no invented ad copy), OG image
      (the real artwork image where eligible, omitted otherwise — never a stand-in)
- [x] Same for `/artist/[slug]` (name, nationality/lifespan) and `/movement/[slug]`
      (name, real characteristics text or an honest fallback)
- [x] `/explore` left on the static site-wide metadata — filter-driven, per-combination
      metadata would be overkill for Phase 1, as anticipated
- [x] Wrapped `getArtworkBySlug`/`getArtistBySlug`/`getMovementBySlug` in React's
      `cache()` — `generateMetadata` and the page component both call the same function
      per request; without this it's two identical DB round-trips instead of one.
      Request-scoped only, no interaction with §13's stale-data concern
- [x] Verified live via curl + view-source on real pages: correct `<title>`, description,
      and OG tags for a real artwork, artist, and movement page
- [x] 83 tests passing, typecheck clean (no test changes needed — pure additive metadata
      functions, no query-shape change)
- [x] Removed the matching README Known-limitations bullet
