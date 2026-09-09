# 22 — Standalone "Compare and understand" tool

**What to build:** §5's third "memorable experience." A comparison table already exists
(`RelatedView === "comparison"` on the artwork page), but only over an artwork's own
verified related pieces, capped at 3. §5 asks for a general-purpose tool: pick 2–4 works
(any works, not just linked ones) and compare on desktop, 2 comfortably on mobile.

**Blocked by:** none — the sitemap doc already reserves the route
(`/compare?a=<slug>&b=<slug>&...`, `docs/superpowers/specs/2026-09-08-...sitemap.md`).

**Status:** planned

- [ ] `/compare` page reading 2–4 slugs from the query string
- [ ] Reuse the existing comparison-table rendering logic from the artwork page rather
      than duplicating it (`src/app/artwork/[slug]/page.tsx`'s comparison view — worth
      extracting into a shared component first)
- [ ] Entry points: a "Compare" action from Explore results (select 2–4, then go) and from
      an artwork page (add this work to a comparison), not just a bare URL
- [ ] Mobile: 2 works comfortably, not a horizontal-scroll table hiding columns (§12:
      "avoid horizontal comparison layouts that hide essential context")
- [ ] Same content rules as the existing comparison view: preserved aspect ratios, "screen
      size doesn't reflect physical scale" note, relative-size comparison only when
      dimensions are documented and compatible — don't invent a scale bar from partial data
- [ ] Remove the matching README Known-limitations bullet once done
