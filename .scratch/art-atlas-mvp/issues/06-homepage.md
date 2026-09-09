# 06 — Homepage

**What to build:** The homepage a first-time visitor lands on: a large, properly credited artwork image; a concise value proposition; search by artwork/artist/description; an editorial related-piece story pulled from real catalogue data; and discovery cards for artists, styles, and places. No invented visitor counts, reviews, or museum partnerships.

**Blocked by:** 05 — Bulk ingest + admin review workflow

**Status:** done

- [x] Hero artwork image is real, credited, and links to its artwork page (Wheat Field with Cypresses)
- [x] Search bar is present and functional from the homepage — verified live: `monet` → 15 real results
- [x] Featured related-piece story — **descoped**, see note below
- [x] Discovery cards (artists/museums) link to real pages, not placeholders — verified live for both `/artist/<slug>` and `/museum/<slug>`. Style cards descoped, see note.
- [x] No fabricated metrics or claims of partnerships anywhere on the page

**Descoped with the user's explicit sign-off, not silently:**
- **Related-piece story**: tried to verify one real relationship (Van Gogh's AIC "Cypresses" reed-pen drawing + Met's "Wheat Field with Cypresses") — every museum's own detailed page is bot-blocked (matches the source register's finding), and the pair turned out genuinely ambiguous (the drawing may record a *different* Met "Cypresses" oil not in our corpus). Verifying even one relationship properly is ticket 09's full scope. Homepage shows an honest "Coming soon" note instead of a dead link or a guessed relationship.
- **Style discovery cards**: `MovementStyle` table is empty — style/movement text was ingested as `Assertion` rows (`styleTitle`, `subjectTags`), not normalized into real entities yet (ticket 08). Homepage shows "Coming soon" instead of a placeholder card.

**Pulled forward as small real slices (not fully scoped tickets):**
- `/artist/<slug>` — minimal (name, bio pulled from an artwork-level assertion, real works list). Full artist page (proper entity-level bio, lifespan, places worked, related artists) stays ticket 08's job.
- `/museum/<slug>` — minimal (name, city, real holdings list). Visit link, hours-with-freshness, exhibitions stay ticket 10's job.
- `/explore?q=` — minimal title/artist search only, no filters. Full Explore page (date range, movement/style, medium, museum, city, display status, URL-preserved filters, no-result suggestions, pagination) stays ticket 07's job — same route, will grow into it.
