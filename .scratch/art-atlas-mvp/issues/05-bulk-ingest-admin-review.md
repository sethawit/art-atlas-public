# 05 — Bulk ingest + admin review workflow

**What to build:** Scale the two proven adapters (tickets 03, 04) to import the Phase 1 corpus (200–500 artworks across Met + AIC), plus the minimum admin workflow to make that import trustworthy: duplicate flagging (matching titles or similar-looking images are never sufficient to auto-merge physical objects), field-level assertion review, and the ability to correct a record or remove an ineligible image without deleting the artwork.

**Blocked by:** 03 — Met ingestion → single artwork end-to-end, 04 — AIC ingestion → single artwork end-to-end

**Status:** ready-for-agent

- [ ] Bulk run imports artworks from both adapters into the core data model, logging sync failures, last success, missing rights, and stale records
- [ ] Possible duplicates are flagged for review, never auto-merged on title/image similarity alone
- [ ] Admin can review conflicting assertions, approve a preferred value, and see the source/retrieval date behind each
- [ ] Admin can remove an ineligible image without deleting the underlying artwork record
- [ ] Source changes and editorial changes are distinguishable in the review UI
- [ ] Corpus reaches 200–500 verified artworks, or the actual count is reported honestly if short
