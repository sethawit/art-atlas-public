# 07 — Explore/search with filters

**What to build:** `/explore` — the searchable catalogue with filters for creation date range, movement/style, medium, museum, city, and display status. Filter state lives in the URL so it survives navigation and can be shared. Confirmed metadata is visually separate from any experimental/semantic matches. Useful suggestions appear on no-result searches instead of a dead end.

**Blocked by:** 05 — Bulk ingest + admin review workflow

**Status:** done

- [x] Five of six filter dimensions work and combine correctly (creation date range, medium, museum, city, display status) — verified live: museum+city, medium, date range, and combined-AND all correct against real data. **Movement/style deferred, not faked** — `MovementStyle` has no real data yet (ticket 08); the form shows an honest "coming soon" note instead of a dropdown with nothing behind it.
- [x] Filter state round-trips through the URL — every filter is a GET query param, all links (pagination, view switches) preserve it
- [x] Basic spelling tolerance is supported (trigram fallback via `pg_trgm`, `word_similarity()`) — verified live: `q=munet` → 16 real Monet works. "Title aliases" (alternate-title data) not implemented — no alternate-title field exists anywhere in the data model; would need its own ingestion work, not just a query change
- [x] No-result state offers concrete suggestions (top artists), not a blank page — verified live
- [x] Results paginate (24/page) — verified live

**Also fixed while building this:**
- Added `PhysicalObject.displayStatus` (defaults honestly to `"unconfirmed"` — §7's rule that ownership never implies display status) — this was referenced by ticket 09's Family Explorer cards as hardcoded text before this ticket; now real and filterable, and the artwork page's Overview + Family Explorer cards both read the real field.
- Real bug: the spelling-tolerance fallback query used `SELECT DISTINCT` with an `ORDER BY` expression not in the select list — Postgres rejects that outright. Fixed by dropping `DISTINCT` (the Artist join is 1:1, never a row multiplier, so it wasn't needed).
- Real bug: `similarity()` scored a short misspelled word against a full multi-word name far too low to clear any sane threshold (e.g. "munet" vs "Claude Monet" = 0.19). Switched to `word_similarity()`, which matches against the best-fitting substring instead of the whole string.
- Test-suite hygiene: found and fixed a double-suffixed slug bug in my own test fixtures, and added cleanup (the shared test DB isn't wiped between runs, so earlier test files' leftover rows were already polluting broad, unscoped queries).

**Follow-up (found in a later master-prompt comparison pass):** §6 says "search by artwork, artist, **or description**." Search covered only title/artist — never `subjectTags`, this catalogue's real descriptive text. Fixed: `matchingArtworkIdsForQuery` now also matches `subjectTags` Assertion values (substring, case-insensitive), unioned with the title/artist matches. Verified live: `?q=Summer` returns 8 real results including "Wheat Field with Cypresses" — a title that doesn't contain "Summer" at all, only its subject tags do. 1 new test, runId-unique tag term per the ticket 14/16 postmortem discipline.
