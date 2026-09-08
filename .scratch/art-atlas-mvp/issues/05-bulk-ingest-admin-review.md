# 05 — Bulk ingest + admin review workflow

**What to build:** Scale the two proven adapters (tickets 03, 04) to import the Phase 1 corpus (200–500 artworks across Met + AIC), plus the minimum admin workflow to make that import trustworthy: duplicate flagging (matching titles or similar-looking images are never sufficient to auto-merge physical objects), field-level assertion review, and the ability to correct a record or remove an ineligible image without deleting the artwork.

**Blocked by:** 03 — Met ingestion → single artwork end-to-end, 04 — AIC ingestion → single artwork end-to-end

**Status:** done

- [x] Bulk run imports artworks from both adapters into the core data model, logging sync failures, last success, missing rights, and stale records (`IngestLog` table; `npm run ingest:bulk`; retry-once + AIC rate-limit spacing)
- [x] Possible duplicates are flagged for review, never auto-merged on title/image similarity alone (`DuplicateFlag` table, keyed off `PhysicalObject.externalRecordUrl` identity — see below)
- [x] Admin can review conflicting assertions, approve a preferred value, and see the source/retrieval date behind each (`/admin/artworks/<slug>`, verified live in-browser)
- [x] Admin can remove an ineligible image without deleting the underlying artwork record (soft-delete via `ImageAsset.removedAt`, verified live in-browser — public page falls back to "Image unavailable")
- [x] Source changes and editorial changes are distinguishable in the review UI (approved assertions carry a `selectionReason` of "Editorial: approved by admin on `<date>`", visible next to the original sourced value)
- [x] Corpus reaches 200–500 verified artworks, or the actual count is reported honestly if short — reached **64 real artworks** from live Met + AIC data (user chose a ~60-artwork run over the full 200–500 given AIC's 60 req/min throttle; script reports the shortfall honestly when run)

**Found and fixed while implementing:**
- The original ticket 03/04 write path upserted `PhysicalObject` by `Artwork.slug` alone — two different physical objects sharing a title (e.g. two different "Self-Portrait" paintings) would have silently overwritten each other. Rewrote around `PhysicalObject.externalRecordUrl` as the real identity key (added, unique); a slug collision with a different external record now creates a second, disambiguated `Artwork` and raises a `DuplicateFlag` instead. Proven with a dedicated integration test (`tests/write-normalized-artwork.test.ts`) and live during the real bulk run (AIC "The Bedroom" re-observed via a different search term).
- A live Met object with a BC date (objectID 329077, "Head of a ruler ca. 2300–2000 BCE") crashed ingestion — Postgres/node-postgres can't serialize a JS `Date` with a negative year. Fixed via `safeYearDate` (drops the sortable earliest/latest pair for BC dates, keeps the display text); regression test added.
- The two artworks seeded by tickets 03/04 predated the `externalRecordUrl` column and needed a one-time manual backfill from their existing `sourceRecordUrl` assertions — done directly against the dev DB (not a migration, since a fresh DB never hits this).

**Known Phase 1 gap, recorded not fixed:** `/admin` has no authentication — flagged in a visible banner on every admin page and here. Do not deploy publicly without adding access control first.
