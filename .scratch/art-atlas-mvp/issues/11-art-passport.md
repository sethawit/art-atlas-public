# 11 — Art Passport

**What to build:** `/passport` — local, account-free saved lists (Want to see, Seen, Want to understand) with private notes, filterable by city, artist, or style. Saved state is disclosed to the user as staying on their device (no account sync in Phase 1). No guarantee of future display or opening hours is implied from historic records.

**Blocked by:** 03 — Met ingestion → single artwork end-to-end, 04 — AIC ingestion → single artwork end-to-end, 10 — Museum/city pages + map view

**Status:** done

- [x] Save/remove works from any of the three lists, persisted locally, from the artwork page — verified live: checkbox toggle on/off, an artwork can be in multiple lists at once
- [x] Private notes attach to a saved work and are never shown publicly — notes live only in `localStorage`, never sent to the server (no API route touches them at all); verified a typed note persists and reloads correctly
- [x] Filter saved works by city, artist, or style — verified live, filter options populate from what's actually saved
- [x] City page (ticket 10) surfaces relevant saved works and museum links — verified live: `/city/chicago` shows "The Bedroom — Vincent van Gogh — seen" after saving it
- [x] UI discloses that saved data is local-only, no account sync yet — on both the artwork-page controls and the `/passport` page itself

**Built:**
- `src/lib/passport/storage.ts` — pure localStorage read/write logic (one entry per artwork, multiple statuses per entry, snapshot data captured at save time so the passport page never needs a DB round-trip). Wrapped in try/catch throughout — storage can throw (private browsing, disabled storage) and a saved-list feature failing silently beats it crashing the page. 9 unit tests against an in-memory storage stand-in (no jsdom dependency needed for pure logic).
- `PassportControls` — save/remove + note UI on the artwork page, mounted client-side only (avoids a hydration mismatch, since the server can't know what's in the visitor's `localStorage`).
- `/passport` — grouped-by-list view, city/artist/style filters, editable notes, remove action.
- `CitySavedWorks` — small client island on the city page (ticket 10) filtering saved entries to that city.
- No database changes, no API routes — this entire ticket is client-only per the product spec's explicit account-free-MVP design.
- 64 tests passing, typecheck clean. Entirely live-verified in-browser (save, multi-list, note persistence, filters, city tie-in) since none of this has a server-renderable state to curl.
