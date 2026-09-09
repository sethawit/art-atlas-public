# 28 — LocationAssertion entity (gap closure)

**What to build:** §10 explicitly names `LocationAssertion` as its own data-model entity,
distinct from generic `Assertion`. It didn't exist — `displayStatus`/`publicAccess` were
plain `PhysicalObject` columns with no source, retrieval time, or verification status
attached, contrary to §7: "Store the original source statement, source URL, retrieval
time, relevant effective date range, and verification status."

**Blocked by:** none.

**Status:** done

- [x] `LocationAssertion` model — `field` ("displayStatus" | "publicAccess"), `value`,
      `sourceStatement` (plain-words account of what's actually known — neither source
      gives a live display feed, so this is honest, not a fabricated quote),
      `sourceId`/`retrievedAt` (real FK to `Source`, unlike the plain columns which had
      none), `effectiveFrom`/`effectiveTo`, `verificationStatus` ("verified" |
      "unconfirmed" — distinct from ticket 23's dynamic staleness check, which asks
      whether a verified claim has gone stale, not whether it was ever verified)
- [x] Deliberately additive, not a replacement: `PhysicalObject.displayStatus`/
      `publicAccess` stay as the fast denormalized columns every existing filter/read
      site already uses (Explore's filter, admin, `getRelatedPieces`, ticket 23's
      freshness check) — same pattern every other `PhysicalObject` field already follows,
      none of which route through generic `Assertion` either. Rewriting every read site
      to join through `LocationAssertion` would have been a much larger, riskier change
      for no functional gain; this is the real sourced record §7 asks for, sitting
      alongside the fast path, not replacing it.
- [x] Written in the shared `writeNormalizedArtwork` path (not per-adapter) — applies
      identically to Met and AIC, since neither gives a live display feed and both are
      verified public museums. Idempotent: upserts by `(physicalObjectId, field)`,
      `retrievedAt` refreshed on every re-ingest.
- [x] Ticket 23's freshness check now reads `LocationAssertion.retrievedAt` instead of
      `PhysicalObject.updatedAt` — more precise (a dedicated field for exactly this
      purpose, not a generic write timestamp that happens to correlate).
- [x] Artwork page's "Where to see it" section now shows the real `sourceStatement` +
      `verificationStatus` alongside the display status/public access values.
- [x] Backfilled the real corpus (re-ran `backfill-place-or-culture.ts`, which re-ingests
      every known object): **668 real `LocationAssertion` rows (334 × 2), 100% coverage**
      — every physical object now has both.
- [x] 4 new tests (both rows written with correct values/verification status/source
      attribution, real source-statement text, idempotent upsert with `retrievedAt`
      refreshed not duplicated), 123 tests total, stable across 3 runs, typecheck clean.
- [x] Found and fixed a real FK-order bug while running the new tests:
      `tests/helpers/cleanup.ts` deleted `PhysicalObject` rows before their
      `LocationAssertion` children, since this was the first test to create real
      `LocationAssertion` rows through the actual `writeNormalizedArtwork` path rather
      than a hand-built fixture. Added the missing delete step.
- [x] Verified live on a real artwork page (Van Gogh's "The Bedroom," AIC-sourced): both
      real statements render — "Art Institute of Chicago API provides no live
      display-status feed for this object; defaults to 'unconfirmed' rather than
      guessing. (unconfirmed)" and "The Art Institute of Chicago is a verified public
      museum offering public access... (verified)."
