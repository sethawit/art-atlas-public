# 10 — Museum/city pages + map view

**What to build:** `/museum/<slug>` (and `/city/<slug>`) pages showing institution details, catalogue coverage, an official visit link, artworks in our catalogue, and saved works — plus `/map`, the map/list of holding institutions linked to catalogued artworks. Hours, ticket prices, gallery numbers, and exhibitions are shown only when sourced from an appropriate current source, with freshness info attached; otherwise they're omitted rather than guessed.

**Blocked by:** 05 — Bulk ingest + admin review workflow

**Status:** ready-for-agent

**Note (ticket 06):** `/museum/<slug>` already exists as a minimal page (`src/app/museum/[slug]/page.tsx`, `src/lib/queries/get-institution-by-slug.ts`) — name, city, real holdings list. Extend rather than recreate: still needed here — official visit link, `/city/<slug>`, `/map`, freshness-labeled hours/exhibitions, and the Art Passport tie-in.

- [ ] Museum page lists its catalogued artworks and links to the institution's official site
- [ ] Any hours/ticket/exhibition info carries a source and freshness label, or is omitted
- [ ] `/map` shows all institutions holding catalogued artworks with working links to their pages
- [ ] Map has an accessible list-view alternative (not map-only)
- [ ] City page surfaces relevant saved works once Art Passport (ticket 11) exists
