# 22 — Standalone "Compare and understand" tool

**What to build:** §5's third "memorable experience." A comparison table already exists
(`RelatedView === "comparison"` on the artwork page), but only over an artwork's own
verified related pieces, capped at 3. §5 asks for a general-purpose tool: pick 2–4 works
(any works, not just linked ones) and compare on desktop, 2 comfortably on mobile.

**Blocked by:** none — the sitemap doc already reserves the route
(`/compare?a=<slug>&b=<slug>&...`, `docs/specs/2026-09-08-...sitemap.md`).

**Status:** done

- [x] `/compare?slug=a&slug=b...` reads 2–4 slugs from the query string, linkable/
      shareable — no client-side selection state
- [x] New `getArtworksForComparison` query (`src/lib/queries/get-artworks-for-comparison.ts`):
      real title/artist/date/medium/dimensions/institution/image per work, in the
      caller's slug order, capped at 4, silently skipping a slug that doesn't resolve
      (a stale/mistyped slug shouldn't break the other real works still comparing)
- [x] Reused the `.comparison-table` CSS class from the artwork page's own comparison
      view rather than writing new styling — same mobile stacking behavior, already
      handles §12's "avoid horizontal layouts that hide context"
- [x] Entry points: "Compare selected" checkboxes on Explore results (GET form to
      `/compare`), and a "Compare with this work" link per related piece on the artwork
      page's grid view (`/compare?slug=<this>&slug=<related>`) — a bare-URL text-input
      fallback also exists on `/compare` itself for adding a work by known slug directly,
      honestly a supplementary affordance, not a full search picker
- [x] Same content rules as the existing comparison view: real aspect ratios preserved
      (no cropping), "screen size doesn't reflect physical scale" note, no invented
      relative-size bar — dimensions shown as documented text only
- [x] 5 new tests (order preservation, skip-unknown-slug, 4-work cap, empty list,
      dedup), 88 total, stable across 3 consecutive runs; typecheck clean
- [x] Verified live: a real 2-work comparison (Wheat Field with Cypresses + Water
      Lilies) plus a deliberately-invalid third slug renders correctly with a visible
      skip note; both entry points confirmed live on real pages
- [x] Removed the matching README Known-limitations bullet

## Follow-up: related-piece labels + sourced differences (found in the next master-prompt comparison pass)

§5 requires "images, dates, materials, dimensions, **related-piece labels**, collections,
and **concise sourced differences**" — the original build shipped everything except the
last two. Closed:

- [x] `getPairwiseComparisonInsights` — for every pair among the compared works, checks
      for a real `Relationship` row (either direction) and surfaces its
      `relationshipLabel` if one exists, or an honest "no documented relationship between
      these two" otherwise
- [x] "Concise sourced differences" — factual sentences derived only from fields already
      shown on the page (medium, dimensions, date, institution), never generated prose or
      a judgment call about which work is "better." Year gaps only computed from a clean
      single 4-digit date on both sides (a range or "c." qualifier is skipped, not
      guessed at)
- [x] New "How these works relate and differ" section on `/compare`, one entry per pair
      (so 3-4 works show multiple pairwise comparisons, not just adjacent ones)
- [x] 5 new tests (real relationship surfaced, no-relationship case, all 4 difference
      types on a real mismatched pair, no-differences case, one-insight-per-pair for 3+
      works). 119 tests total, stable across 3 runs, typecheck clean
- [x] Verified live: a real documented `same_series` pair shows the label with no
      differences (matching fields); Wheat Field with Cypresses vs. Water Lilies (no
      relationship) shows real computed differences — dimensions, "17 years apart,"
      different institutions
