# 29 — Real gallery location, evidence-based displayStatus, changeable-data refresh, DB setup automation

**What to build:** Four real gaps found in a master-prompt comparison pass — grouped in
one ticket since two are small (docker-compose, museum/city metadata) and two are
related (gallery location feeds both `displayStatus` and the §9 refresh job).

**Blocked by:** none.

**Status:** done

## 1. `art_atlas_test` DB creation automated

- [x] `docker/initdb/01-create-test-db.sql`, mounted into `/docker-entrypoint-initdb.d/`
      via `docker-compose.yml` — Postgres's official image runs every `*.sql` file there
      once, on a genuinely fresh data directory only.
- [x] Verified live: ran a throwaway `postgres:16` container with a fresh anonymous
      volume and this init script mounted — both `art_atlas_dev` and `art_atlas_test`
      existed after startup (`CREATE DATABASE` ran twice in the logs, confirmed via
      `psql -l`). Container removed after the check; nothing touched the real dev volume.
- [x] README setup steps simplified — the manual `psql -c "CREATE DATABASE..."` step is
      gone.

## 2. Museum/city pages: `generateMetadata`

- [x] Both were real "public detail pages" (§6) missing from ticket 20's SEO pass —
      only artwork/artist/movement got it.
- [x] `getInstitutionBySlug`/`getCity` wrapped in React's `cache()` (same reasoning as
      ticket 20), `generateMetadata` added to both pages with real title/description
      (work count, city, institution count).
- [x] Verified live (against the actual dev DB, via curl): real `<title>` and
      `<meta name="description">` on both a museum and a city page.

## 3. Real gallery location → evidence-based `displayStatus`

- [x] **Real finding**: the Met's `GalleryNumber` field was typed in `met/client.ts` but
      never read anywhere — checked live, 76% populated across our corpus. AIC has the
      equivalent (`gallery_title`/`gallery_id`), confirmed real on other objects (0% on
      our specific holdings right now, a fact about which objects we ingested, not a code
      gap). This directly contradicted a comment repeated through this session
      ("none of our sources give us a live display feed") — true for AIC's current
      holdings, false for the Met.
- [x] `PhysicalObject.galleryLocation` (new column) + `NormalizedArtwork.galleryLocation`
      threaded through both normalizers.
- [x] `displayStatus` is now real: `"on_display"` **only** on a real positive gallery
      location, never inferred from its absence (§7: "do not turn uncertainty into exact
      values") — a blank gallery number could mean off view or simply unreported, so it
      stays `"unconfirmed"`, not a guessed `"not_on_display"`.
- [x] `LocationAssertion.displayStatus` now carries real, per-object evidence
      (`sourceStatement` names the actual gallery, `verificationStatus: "verified"`) when
      available, the same honest "no signal" disclosure as before otherwise.
- [x] Shown on museum/city pages next to each work.
- [x] Backfilled the real corpus: **154/334 physical objects (46%) now have a real,
      evidence-based `on_display` status** — up from 0/334 always-`"unconfirmed"`.
      Confirmed live via direct query and the artwork page's own Journey/Where-to-see-it
      section (real sourceStatement text: `Met Collection API lists this object's
      current location as "605".`).
- [x] 8 new tests across `write-normalized-artwork.test.ts` (derives on_display from a
      real gallery location; never infers not_on_display from absence).

## 4. Changeable-data refresh, separate from stable metadata (§9 item 9)

- [x] **Real finding**: the only sync mechanism (`backfill-place-or-culture.ts`)
      re-ingests everything uniformly — medium, dimensions, images, provenance, all of
      it — every time, contrary to §9's explicit "refresh changeable data separately
      from relatively stable art-history metadata."
- [x] `refreshLocationData` (`src/lib/ingest/refresh-location-data.ts`) — touches only
      `displayStatus`/`galleryLocation` and the one `LocationAssertion` row, nothing
      else. `publicAccess` stays out of this path deliberately — it's the *stable*
      institutional fact in this pair, not the changeable one.
- [x] `fetchAicGalleryLocation` — a genuinely minimal AIC request
      (`fields=id,gallery_title`, confirmed live to return just those two keys), real
      bandwidth savings, not just a narrower write. The Met API has no field-selection
      (confirmed in the source register), so its fetch is the same size as a full ingest
      — the separation there is real at the write level, not the fetch level; disclosed
      honestly in the script's own comment rather than implied as a full win.
- [x] `npm run refresh:location` — real run against the actual corpus: 70 Met + 264 AIC,
      0 failed, same 154/334 `on_display` result as the full backfill (consistency
      check: two different code paths agreeing confirms correctness).
- [x] 5 new tests (derives on_display, stays unconfirmed on absence, doesn't touch
      medium/dimensions/accessionNumber, real LocationAssertion evidence, idempotent).
- [x] 130 tests total, stable across 3 consecutive runs, typecheck clean throughout.

**Known limitation carried forward, not new:** the museum/city pages' `galleryLocation`
display couldn't be visually confirmed against a running dev server in this session — the
long-running dev server the terminal already had open predates this migration, so its
in-memory Prisma Client doesn't know the new column yet (the same stale-client gotcha
documented in ticket 13's file). The code typechecks against the freshly generated Prisma
types and the underlying data is confirmed correct via direct query; a normal `next dev`
restart picks it up.
