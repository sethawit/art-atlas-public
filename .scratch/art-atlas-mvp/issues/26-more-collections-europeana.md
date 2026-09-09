# 26 — More collections beyond Met/AIC (Phase 2, Track B)

**What to build:** §3 Phase 2: "more collections." §8 lists Europeana as the natural
cross-institution candidate. This ticket is the required research pass (§8: "verify
current access, coverage, authentication, pagination, limits, caching, attribution, and
metadata/image rights before implementation") — not ingestion code, per the finding below.

**Blocked by:** a user-provided Europeana API key (see Status).

**Status:** research done, ingestion blocked (real blocker, not deprioritized)

- [x] Verified live: Europeana's Search API requires a registered API key — an
      unauthenticated request returns a real `invalid_apikey` error, confirmed by curl,
      not assumed from docs. A material access difference from the Met/AIC (both fully
      keyless).
- [x] Endpoints, pagination (offset capped at 1,000 results, cursor-based required
      beyond that), and the item-level rights field name (`edm:rights` /
      `europeana:rights`) all confirmed via Europeana's own Knowledge Base docs.
- [x] Rate limit numbers **not confirmed** — the linked fair-use-policy page wasn't
      directly fetchable in this pass. Recorded as an open gap, not guessed at.
- [x] **Why this stops at research, not code**: obtaining a key requires creating an
      account on Europeana's site — account creation on a third-party service is outside
      what gets done on the user's behalf without them doing it directly. This is a real
      operating constraint, not a research shortfall — the access method, pagination
      shape, and rights field are all confirmed workable. §8's own instruction for
      exactly this situation: "If access is unavailable, identify the exact missing
      capability and continue with permitted sources" — done; Met + AIC remain the only
      ingested collections.
- [ ] If the user registers a personal Europeana API key: build the adapter following
      the same discipline as `src/lib/aic/client.ts`/`src/lib/met/client.ts` — verify
      every field against a live sample before writing the normalizer, don't trust the
      docs' field list alone (ticket 04's/25's own precedent — AIC's docs don't publish
      a complete field list either, and a live probe found real gaps).
