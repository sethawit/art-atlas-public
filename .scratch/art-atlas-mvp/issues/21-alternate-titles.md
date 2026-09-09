# 21 — Alternate-title field

**What to build:** §6 artwork page explicitly lists "title/alternate titles." No
alt-title field exists in the data model or either source adapter yet. Both the Met and
AIC APIs carry some form of alternate/former title where the museum records one — needs
verifying (§8: "inspect actual available fields," not assumed) before building the field.

**Blocked by:** none.

**Status:** done (no field built — confirmed absent in practice)

- [x] Checked the Met API's actual response schema live (`GET
      /public/collection/v1/objects/436535`, full key list) — no alternate/former-title
      field of any kind exists; only a single `title` string.
- [x] Checked the AIC API live: `alt_titles` does exist as a documented field, but is
      `null` on every one of 106 real objects sampled (6 individually-checked ukiyo-e/
      Impressionist works plus a 100-object general search) — present in the schema,
      unpopulated in practice.
- [x] Decision: don't build the field. Adding `alternateTitles` to `Artwork` for data
      that's null on every real record checked would be a column that never displays
      anything, contradicting the master prompt's own instruction (§13: label
      placeholders explicitly, exclude from factual results — here the honest move is not
      adding the column at all rather than shipping a permanently-empty one).
- [x] Documented in README's Known limitations, same evidentiary bar as the
      movement-data-is-AIC-only precedent (ticket 08) — a confirmed source gap, not an
      unbuilt feature.
