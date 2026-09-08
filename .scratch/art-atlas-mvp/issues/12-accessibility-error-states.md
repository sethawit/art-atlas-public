# 12 — Accessibility + error/loading/empty states pass

**What to build:** A cross-cutting pass over every Phase 1 page (homepage, explore, artwork, artist, movement, museum/city, map, passport) confirming keyboard navigation, visible focus, meaningful alt text, adequate contrast, reduced-motion support, labelled controls, and accessible map/list alternatives — plus loading, unavailable-image, offline/API-failure, empty-saved-list, unknown-location, and no-match states, each with real fallback content rather than a blank or broken view. Mobile layouts keep search and saving easy and avoid horizontal comparison layouts that hide essential context.

**Blocked by:** 06 — Homepage, 07 — Explore/search with filters, 08 — Artist pages + movement/style pages, 09 — Related-piece stories + Family Explorer, 10 — Museum/city pages + map view, 11 — Art Passport

**Status:** ready-for-agent

- [ ] Every primary action has a working destination and visible feedback
- [ ] Keyboard-only navigation reaches every primary control across all Phase 1 pages
- [ ] Colour is never the sole carrier of era or status information
- [ ] Loading/empty/error/offline/unknown-location/no-match states are implemented and visually distinct from success states
- [ ] Mobile layouts verified on all Phase 1 pages, no horizontal comparison layout on small screens
