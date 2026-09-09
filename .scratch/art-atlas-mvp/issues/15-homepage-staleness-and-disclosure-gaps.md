# 15 — Homepage staleness + honest-disclosure gaps (gap closure)

**What to build:** Three real gaps found during a fourth master-prompt-vs-implementation
comparison pass — not part of the original backlog.

1. **Homepage was stale, not just incomplete.** `src/app/page.tsx` still said "Related
   pieces — Coming soon... None have cleared that bar yet" and "Explore by style — Coming
   soon — style and movement pages are still being built," both written at ticket 06,
   before tickets 08 (movements) and 09 (relationships) shipped real data for exactly
   those two sections. A real bug — the homepage was hiding features that already exist —
   not a missing-feature gap.
2. §6's `/explore` requires 6 filters; only 5 are built (movement/style is missing). This
   was disclosed in a code comment but never in README's Known limitations.
3. §3's Phase 1 target is "at least 10 carefully verified related-piece stories," with an
   explicit instruction to "report any shortfall honestly." The corpus has 22
   `Relationship` rows, but they resolve to only 2 distinct stories (a 7-work clique
   expressed as 21 pairwise edges, plus 1 documented-influence pair) — README stated the
   relationship count without stating the story count, which could read as satisfying the
   target when it doesn't.

**Blocked by:** none.

**Status:** done

- [x] Homepage's "Related pieces" section now shows a real featured story — the
      documented-influence pair (Water Lily Pond → Water Lilies, sourced to AIC's
      scholarly catalogue) — chosen over an edge from the Monet clique because it's one
      self-contained story rather than a slice of a bigger one
- [x] Homepage's "Explore by style" section now lists the 4 real `MovementStyle` rows
      with real artwork counts, linked to their real `/movement/[slug]` pages
- [x] Both fall back to their original "coming soon" copy if the underlying data is ever
      empty again, rather than rendering broken
- [x] README: added the 2-stories-vs-10-target disclosure next to the relationship count,
      added the missing movement/style filter to Known limitations, added both to Next
      actions
- [x] Verified live: homepage renders the real story and real style list with working
      links (`/artwork/water-lily-pond`, `/artwork/water-lilies`, `/movement/*`)
- [x] Typecheck clean; no test changes needed (no query logic added, direct Prisma reads
      in the page component, same pattern as the rest of the homepage)
