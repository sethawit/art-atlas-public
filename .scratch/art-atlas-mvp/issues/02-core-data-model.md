# 02 — Core data model + migrations

**What to build:** The foundational relational schema Phase 1 ingestion and pages will read/write: Artwork/PhysicalObject, Artist/Agent, Movement/Style/Period, Institution, ImageAsset, Source, and Assertion, with the distinctions the master prompt requires preserved (a work vs. its physical impressions; a series is not an edition; a collection is not automatically a series). Assertions support multiple conflicting values with a preferred display value, source, retrieval date, effective dates, and reason for editorial selection. Migrations run cleanly against an empty database, and a seed row for each entity can be written and read back.

**Blocked by:** 01 — Verify Met + AIC source register

**Status:** ready-for-agent

- [ ] Migrations create all listed entity tables plus their key relationships
- [ ] Assertion table supports multiple values per field with source, retrieval date, effective dates, and selection reason
- [ ] Creation-date fields store display text alongside sortable earliest/latest values and a precision marker (exact/approximate/disputed)
- [ ] A physical object's own identifiers/dimensions are distinct from the named artistic work/concept it belongs to
- [ ] Seed-and-read round-trip test passes for each entity
