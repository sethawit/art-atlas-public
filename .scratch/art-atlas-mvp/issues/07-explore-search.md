# 07 — Explore/search with filters

**What to build:** `/explore` — the searchable catalogue with filters for creation date range, movement/style, medium, museum, city, and display status. Filter state lives in the URL so it survives navigation and can be shared. Confirmed metadata is visually separate from any experimental/semantic matches. Useful suggestions appear on no-result searches instead of a dead end.

**Blocked by:** 05 — Bulk ingest + admin review workflow

**Status:** ready-for-agent

**Note (ticket 06):** `/explore?q=` already exists as a minimal title/artist search (`src/app/explore/page.tsx`, `src/lib/queries/search-artworks.ts`) — the homepage search bar needed a real destination. Extend this route with filters/pagination/aliases rather than creating a new one.

- [ ] All six filter dimensions work and combine correctly
- [ ] Filter state round-trips through the URL (reload/share preserves results)
- [ ] Title aliases and basic spelling tolerance are supported in search
- [ ] No-result state offers concrete suggestions, not a blank page
- [ ] Results paginate rather than loading the full catalogue at once
