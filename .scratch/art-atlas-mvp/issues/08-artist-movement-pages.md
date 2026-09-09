# 08 — Artist pages + movement/style pages

**What to build:** `/artist/<slug>` and `/movement/<slug>` for the Phase 1 corpus. Artist pages carry sourced biography, lifespan where known, places worked, styles with context (never one label applied across an artist's whole multi-period output), selected works, related artists with explicit relationships, and museums holding their documented works. Movement/style pages explain the term, approximate dates and geography, characteristics, representative works, associated artists, and overlapping traditions/predecessor-successor links where supported.

**Blocked by:** 05 — Bulk ingest + admin review workflow

**Status:** done

- [x] Artist page renders for every artist with required fields populated or explicitly marked unknown — verified live: Van Gogh/Gerard David get real nationality+lifespan (parsed from Met's bio text); Monet honestly shows "Unknown" for both rather than a guess (AIC never gave us artist biography text — no source, no claim)
- [x] A multi-period artist's works show period-appropriate style context, not one blanket label — verified live: Van Gogh's works individually show Realism / Impressionism / Post-Impressionism / (none) per work, not one label for the artist
- [x] Movement page distinguishes period, movement, technique, and style — each page states its `kind` plus a plain-language explanation of what that kind means; "19th century" correctly classified as a period, not a movement (real backfill decision, not a display trick)
- [x] Movement page states its geographic/cultural scope explicitly — "Originated in France, centered on Paris..." etc., no implied universal sequence
- [x] Both page types link back to real artwork pages — verified live

**Built:**
- `parseArtistBio` — conservative extraction (nationality + clean 4-digit year range only) from Met's `artistBio` text, which turns out NOT fully uniform across records (5 real variants checked); falls back to raw text display rather than guessing at fields the source doesn't reliably support. Unit-tested against 5 real bio strings pulled from the live catalogue.
- `normalizeMovements` — backfills real `MovementStyle` + `ArtworkMovement` rows from the `styleTitle` Assertions already ingested (AIC's `style_title` field; Met doesn't provide an equivalent, so Met-only artists honestly show no style). Idempotent, run via `npm run movements:normalize`. Real result: 4 movements, 33 artwork links, from 33 existing assertions — no new external fetching.
- `/movement/<slug>` — kind explanation, geography/characteristics/context (short, defensible general-knowledge text for the 3 movements actually in the catalogue — encyclopedic definitions, not per-object claims, so no per-fact citation the way a Relationship needs one), associated artists, representative works.
- "Places worked" and "related artists": honestly absent, not faked — no source gives structured place-of-work data, and no artist-to-artist relationship has been verified to the same bar ticket 09 set for artwork relationships.
- 55 tests passing (5 new for the bio parser against real data), typecheck clean.
