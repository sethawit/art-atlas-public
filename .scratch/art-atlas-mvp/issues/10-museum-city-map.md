# 10 — Museum/city pages + map view

**What to build:** `/museum/<slug>` (and `/city/<slug>`) pages showing institution details, catalogue coverage, an official visit link, artworks in our catalogue, and saved works — plus `/map`, the map/list of holding institutions linked to catalogued artworks. Hours, ticket prices, gallery numbers, and exhibitions are shown only when sourced from an appropriate current source, with freshness info attached; otherwise they're omitted rather than guessed.

**Blocked by:** 05 — Bulk ingest + admin review workflow

**Status:** done

- [x] Museum page lists its catalogued artworks and links to the institution's official site — verified live: real `metmuseum.org/visit` link, real holdings list
- [x] Any hours/ticket/exhibition info carries a source and freshness label, or is omitted — omitted entirely, with an explicit on-page note explaining why (no source we can attach freshness to), rather than silently missing or guessed
- [x] `/map` shows all institutions holding catalogued artworks with working links to their pages — a real Leaflet map (OpenStreetMap tiles) with a pin per institution at real public coordinates, popup linking to `/museum/<slug>`; verified live in-browser (screenshot + popup click)
- [x] Map has an accessible list-view alternative (not map-only) — always-rendered institution list below the map, not gated behind the map's client-side mount
- [x] City page surfaces relevant saved works once Art Passport (ticket 11) exists — honest "Coming soon" note; ticket 11 doesn't exist yet, nothing to surface

**Built:**
- `INSTITUTION_REFERENCE` — small static table of real, publicly verifiable facts (official visit URLs, geographic coordinates) for the two Phase 1 institutions. Not "sourced content" needing Assertion/citation infra (same category as the Met Open Access URL already hardcoded in ticket 03) — stable facts about the institutions themselves, not ingested per-object data.
- `/city/<slug>` — new; City isn't its own entity (matched by slugifying `Institution.city`, fine at 2-city scale, worth a real entity if the catalogue grows to many cities), lists institutions + their holdings in that city.
- `/map` — real Leaflet map, not a fallback list dressed up as one. The list is still primary/always-rendered for accessibility, per the ticket's explicit "not map-only."
- 55 tests passing (no new ones — these are read pages + one static reference table, no new business logic to unit-test), typecheck clean.
