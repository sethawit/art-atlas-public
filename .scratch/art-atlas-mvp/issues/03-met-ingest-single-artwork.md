# 03 — Met ingestion → single artwork end-to-end

**What to build:** One real Met artwork, retrieved through a Met source adapter (pagination/retry/rate-limit handling per the register from ticket 01), normalized into the core data model, and rendered on a real artwork detail page (`/artwork/<slug>`) — Overview, Understand, and Sources tabs populated with real data and a citation linking back to the Met's own record. This is the tracer bullet: it proves adapter → normalize → store → render works end-to-end before ingestion is scaled up.

**Blocked by:** 02 — Core data model + migrations

**Status:** ready-for-agent

- [ ] Met source adapter fetches and paginates using the confirmed API shape from the source register
- [ ] Retrieved fields are normalized into the core data model without losing original wording (kept as an Assertion alongside the normalized value)
- [ ] `/artwork/<slug>` renders Overview, Understand, and Sources for the seeded artwork
- [ ] Sources tab links to the original Met record and shows retrieval date
- [ ] Image is rendered with correct credit and rights/license info, or is clearly labeled unavailable if ineligible
