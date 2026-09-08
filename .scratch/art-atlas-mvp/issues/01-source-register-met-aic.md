# 01 — Verify Met + AIC source register

**What to build:** A verified source register covering the Met Collection API and the Art Institute of Chicago API — the concrete access method, available fields, image/metadata rights, pagination/rate limits, and caching behaviour actually confirmed by reading each API's current official documentation and testing a sample request, not assumed from the master prompt's starting URLs.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Met Collection API: access method (auth or none), object fields available, open-access image eligibility rule, pagination, rate limits, documented in the register
- [x] AIC API: same, plus its open-access reuse policy caveat (not every image is eligible)
- [x] Register records, per source: access method, useful fields, rights, coverage gaps, freshness, integration priority
- [x] Any missing capability (auth wall, undocumented rate limit, restricted field) identified explicitly rather than assumed
