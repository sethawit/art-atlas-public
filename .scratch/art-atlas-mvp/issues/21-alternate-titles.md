# 21 — Alternate-title field

**What to build:** §6 artwork page explicitly lists "title/alternate titles." No
alt-title field exists in the data model or either source adapter yet. Both the Met and
AIC APIs carry some form of alternate/former title where the museum records one — needs
verifying (§8: "inspect actual available fields," not assumed) before building the field.

**Blocked by:** none.

**Status:** planned

- [ ] Check the Met and AIC API docs/actual responses for an alternate-title field (Met:
      possibly `title` variants or `objectName`; AIC: check `alt_titles` or similar) —
      confirm with a real API call, not the docs alone, same discipline as the
      placeOrCulture backfill (ticket 14 found `culture` empty in practice despite being
      documented)
- [ ] If real data exists: add `alternateTitles String?` (or a small join table if
      multiple values are common) to `Artwork`, populate in both normalizers, display on
      the artwork page
- [ ] If a source's field is empty/unreliable in practice: say so honestly in the ticket
      and in README, same as the movement-data-is-AIC-only precedent — don't force a
      column that stays null for every real record
