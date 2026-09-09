# 20 — Per-page SEO metadata

**What to build:** §13: "Render public detail pages in a search-engine-friendly way, with
stable canonical URLs and meaningful metadata." Canonical URLs already exist (slug-based,
stable). Metadata is currently one static site-wide title/description from the root
layout — no per-page `generateMetadata`.

**Blocked by:** none.

**Status:** planned

- [ ] `generateMetadata` on `/artwork/[slug]`: title (artwork + artist), description
      (short, from real Understand-section content — not invented ad copy), OG image
      (the real artwork image where eligible, its absence otherwise — never a stand-in)
- [ ] Same for `/artist/[slug]` and `/movement/[slug]`
- [ ] Decide `/explore`'s metadata behavior given it's filter-driven (a generic title is
      probably right; per-filter-combination metadata is likely overkill for Phase 1)
- [ ] Verify live: view-source or a real crawler-facing check on a couple of pages, not
      just that the function compiles
- [ ] Remove the matching README Known-limitations bullet once done
