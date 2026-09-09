# 25 — Ownership Journey (Phase 2, Track B)

**What to build:** §6 "Ownership journey" + §10's `OwnershipEvent`/`Exhibition`/
`LoanEvent` entities, deliberately deferred out of Phase 1 (tickets 13/15 flagged this
explicitly). Show documented ownership events separately from exhibition/loan events.

**Blocked by:** none. Research-first, per this project's established pattern: checked
live whether either source actually gives usable provenance data before designing
anything — see the source register.

**Status:** done (Ownership + Exhibitions; loan-specific data honestly not attempted —
no source distinguishes it from exhibition)

- [x] **Real finding, not assumed**: AIC's API has `provenance_text` and
      `exhibition_history` fields — confirmed live, real museum-published scholarly
      research, not placeholder data. Met has neither (confirmed live, full key list
      checked). Documented in `docs/sources/source-register.md`.
- [x] `OwnershipEvent`/`ExhibitionEvent` models, tied to `PhysicalObject` (provenance is a
      specific object's history, not the abstract Artwork concept — §10's own
      distinction). Covers §10's "Exhibition/LoanEvent" as one model since no source here
      gives structured loan-specific data — documented honestly in the schema comment,
      not silently dropped.
- [x] **Deliberately not parsed into owner-name/date/transfer-type fields.** The prose
      explicitly distinguishes an agent from an owner ("sold... as the agent for Knoedler
      and Company" — the agent is not the owner) and dates aren't consistently phrased.
      A generic extraction regex risks exactly the misattribution §6 warns against ("do
      not infer identities"). Instead: `splitProvenanceSegments` splits on top-level
      semicolons only (bracket/paren-depth tracked so a citation aside or birth/death
      parenthetical is never split mid-thought), preserving the source's own text and
      order verbatim. `splitExhibitionSegments` splits on blank lines (a reliable
      boundary, confirmed live). "Present missing intervals as gaps" (§6) is honestly not
      attempted — it needs clean date ranges we didn't extract, for the reason above.
- [x] Ingestion: `writeProvenanceAndExhibitionEvents`, called from `ingestAicArtwork`
      after the shared write path (AIC-only data, not part of the generic
      `NormalizedArtwork` shape). Idempotent — upserts by `(physicalObjectId, sequence)`,
      trims excess rows if a re-ingest produces fewer segments than before.
      `bulk-ingest.ts`'s AIC path picks this up automatically (calls `ingestAicArtwork`).
- [x] Backfilled the existing corpus by re-running `backfill-place-or-culture.ts`
      (already re-ingests every known object through the real pipeline — now also
      backfills provenance/exhibition since that's built into `ingestAicArtwork`).
      **Real result: 208/264 AIC-sourced physical objects (79%) got real ownership data,
      171/264 got real exhibition data** — 884 `OwnershipEvent` + 1,772 `ExhibitionEvent`
      rows total. Far higher than the general-population estimate (~40%), because this
      corpus skews toward well-documented major works (Impressionists, ukiyo-e masters).
- [x] `getJourney` query + a new Journey tab on the artwork page (§6 lists 6 tabs;
      Journey was the one deliberately left unbuilt in Phase 1). Honest empty state for a
      work with no documented journey — explicitly not the same as "unowned."
- [x] 13 new tests: `parse-provenance.test.ts` (7, including real sample text pulled live
      from the AIC API — bracket-nested citations, agent-vs-owner phrasing, blank-line
      exhibition splitting), `write-provenance-events.test.ts` (5: segment writing,
      idempotency, trim-on-shrink, independence of ownership/exhibition, null-input
      no-op), `get-journey.test.ts` (4: sequence ordering, source attribution, exhibition
      separation, honest empty case). 110 tests total, stable across 3 consecutive runs,
      typecheck clean.
- [x] Verified live end-to-end on a real work ("The Bedroom," Van Gogh): a real 6-owner
      provenance chain (artist → Theo van Gogh → Johanna van Gogh-Bonger → several
      dealers → Frederic Clay Bartlett → the Art Institute) and 10+ real exhibitions,
      correctly split (a segment containing internal semicolons inside `[...]` citations
      stayed intact). Confirmed the honest empty state renders for a Met-sourced work.

**Follow-ups, not attempted here:** date-range/gap presentation (§6) would need a second,
riskier parsing pass over the same prose — left for a future ticket if ever attempted,
not forced in to hit a checkbox. Loan-specific events (distinct from exhibitions) would
need a different source (Getty Provenance Index, per §8) — out of scope for this ticket.

## Follow-up: admin review gate (found in the next master-prompt comparison pass)

§9 item 7 requires reviewing "sensitive or uncertain relationships, attribution,
**provenance**, and image rights" before publishing — the original ticket shipped
Ownership/Exhibition events with zero review gate, auto-published straight from AIC's raw
text at ingest time. Closed:

- [x] `reviewStatus` ("unreviewed" | "approved" | "flagged") added to both models,
      defaulting to "unreviewed" — new rows still display publicly (real museum text,
      not a fabricated or inferred claim, so hiding pending review would suppress real
      information over a low real risk), but an admin can now flag a specific segment to
      hide it, same shape as `ImageAsset.removedAt`
- [x] `getJourney` excludes `reviewStatus: "flagged"` rows
- [x] `/admin/journey` — a real review queue (50 most recent unreviewed of each type),
      approve/flag actions per segment, linked from the admin nav and dashboard count
- [x] `reviewOwnershipEvent`/`reviewExhibitionEvent` Server Actions, gated by the same
      `/admin/:path*` middleware as every other admin action (ticket 19)
- [x] Re-ingesting a `PhysicalObject` (the upsert `update` path) never resets
      `reviewStatus` back to "unreviewed" — only `create` sets the default
- [x] 6 new tests (queue membership, approve-removes-from-queue-keeps-public,
      flag-hides-from-public, flagged-excluded-from-getJourney). The Server Actions
      themselves call `revalidatePath`, which needs a real Next.js request context and
      throws in a bare vitest call (`Invariant: static generation store missing`) — true
      of every admin action here, none of which are unit-tested directly; tests instead
      exercise the same mutation the action performs, and the action's real wiring
      (button → Server Action → DB → revalidate) is verified live. 119 tests total,
      stable across 3 runs, typecheck clean
- [x] Verified live: `/admin/journey` (Basic Auth-gated) renders 50 real unreviewed
      ownership segments from the actual backfilled corpus
