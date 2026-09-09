# 17 — Movement/style filter on Explore

**What to build:** The 6th of §6's required Explore filters — filter results by
`MovementStyle`, combinable with the existing 5 (date range, medium, museum, city,
display status).

**Blocked by:** none.

**Status:** planned

- [ ] Add a `movement` param to `searchArtworks`'s filter set (`src/lib/queries/search-artworks.ts`) —
      join through `ArtworkMovement`, same shape as the existing `museumSlug`/`city` joins
- [ ] Add the `<select>` to the Explore form, populated from `getFilterOptions` (real
      `MovementStyle` rows only, same pattern as the medium/museum/city dropdowns —
      already real data per ticket 08/14, no longer "coming soon")
- [ ] Preserve in URL, same as the other 5 filters (`buildQueryString` already handles any
      param generically — confirm it does before assuming)
- [ ] Test: a combined date+movement filter, and a movement filter alone, against real
      seeded fixtures (follow this session's runId-uniqueness discipline — don't use a
      real movement name in a capped/joined test query without checking for corpus
      collision first, per ticket 14's postmortem)
- [ ] Remove the "coming soon" note from the Explore page and the matching line from
      README's Known limitations
