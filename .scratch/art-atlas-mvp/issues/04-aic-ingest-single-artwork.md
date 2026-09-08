# 04 — AIC ingestion → single artwork end-to-end

**What to build:** The same tracer-bullet slice as ticket 03, for the Art Institute of Chicago API: one real AIC artwork through a source adapter, normalized into the core data model, and rendered on the existing artwork detail page. Confirms the page and data model generalize across a second source before bulk ingestion.

**Blocked by:** 02 — Core data model + migrations

**Status:** ready-for-agent

- [ ] AIC source adapter fetches using the confirmed API shape from the source register, respecting its open-access reuse caveat
- [ ] Retrieved fields normalized into the core data model, original wording preserved as an Assertion
- [ ] `/artwork/<slug>` renders the seeded AIC artwork correctly using the same page built in ticket 03 (no AIC-specific page fork)
- [ ] Sources tab links to the original AIC record and shows retrieval date
- [ ] Image rendered with correct credit/rights, or labeled unavailable if ineligible
