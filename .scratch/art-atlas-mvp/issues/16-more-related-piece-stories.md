# 16 — More related-piece stories (toward §3's "at least 10")

**What to build:** More verified `Relationship` rows, researched and published the same
way ticket 09 did (institutional catalogues, Wikidata SPARQL where useful, never inferred
from matching titles alone). Current count: 2 distinct stories (a 7-work Monet clique + 1
documented-influence pair). Target: at least 10.

**Blocked by:** none — same tooling as ticket 09 (`npm run relationships:publish`),
possibly needs `npm run ingest:bulk`/targeted single-object ingest first if a promising
series/pair isn't in the corpus yet (ticket 09's own Stacks-of-Wheat expansion did this).

**Status:** done

- [x] Surveyed the ticket-18-grown 334-artwork corpus for title text stating series
      membership (`"from the series"` / `"from an untitled series"`) — a stronger bar
      than title-similarity inference (§4): AIC's own `title` field states the series
      directly. Confirmed live against the AIC API for a sample object
      (`api.artic.edu/api/v1/artworks/2906`) before publishing anything.
- [x] Found and published 5 new `same_series` stories, all real Japanese ukiyo-e print
      series (AIC-held): Hokusai's "Thirty-Six Views of Mount Fuji" (2 works, 1 edge),
      Hokusai's "Fifty-three Stations of the Tokaido" (4 works, 6 edges), Hokusai's "One
      Thousand Pictures of the Ocean" (2 works, 1 edge), Hiroshige's own, separately-named
      "Fifty-three Stations of the Tokaido" ("with poem" edition — kept distinct from
      Hokusai's series of a similar name, different artist, different specific work) (4
      works, 6 edges), Hiroshige's "Sixty-nine Stations of the Kisokaido" (2 works, 1 edge)
- [x] Checked for other candidate types (`study for`, `preparatory`, `pendant`,
      `companion`, `after `, `cast of`) — found one real preparatory study ("Final Study
      for 'Bathers at Asnières'," Seurat) but the finished painting isn't in our corpus
      (held by the National Gallery, London — a third source, not verified per §8) so no
      relationship could be published; left as a single unlinked work, not forced
- [x] Resumed after the initial pass: broader title-phrase search ("one of a pair",
      "companion", "diptych", "plate", numbered/roman-numeral parts) found one more real
      story — "Still life with musical instruments (one of a pair)", two Met-held
      18th-century French works, both explicitly titled "(one of a pair)" by the Met's
      own record, confirmed live against the Met API (identical title/date/attribution,
      consecutive accession IDs). Published as `pendant_companion` — the first real row
      for that type.
- [x] Went further still: read the actual AIC curatorial description text (CC-BY
      licensed, via the API's `description` field, not just title metadata) for 5 major
      Monet works not yet linked to anything, looking for named documented connections —
      none found (one, "Branch of the Seine near Giverny (Mist)," is explicitly one of a
      documented 14-canvas series, but AIC holds only that single canvas from it — no
      pair to publish)
- [x] Distinct related-piece stories: 2 → 7 → **8** (still short of §3's "at least 10" —
      disclosed honestly in README, not padded; real research effort was spent looking
      for the remaining 2, not just a quick title-text pass)
- [x] Verified live: `/artwork/odawara-...` and
      `/artwork/still-life-with-musical-instruments-one-of-a-pair` both correctly show
      their real related pieces with accurate explanation text and working source links
- [x] Real bug caught while verifying: `npm test` failed on `search-artworks.test.ts`'s
      "filters by medium" test — 5 test files (`data-model`, `get-timeline`,
      `get-looks-familiar`, `publish-relationship`, `write-normalized-artwork`) only
      called `$disconnect()` in `afterAll`, never deleting their own fixtures. Across many
      `vitest run` invocations this session, that left ~900 leftover artworks in the
      shared test DB — 25 "Watercolor"-medium rows crowded the `Sunset` fixture off
      `searchArtworks`'s first page. Same bug class as ticket 14's capped-query fixes,
      caused by missing cleanup rather than a colliding real-world term. Fixed with a
      shared `tests/helpers/cleanup.ts` (`cleanupByRunId`), wired into all 5 files, and
      the ~900 leftover rows purged from the test DB. Stable across 3 consecutive runs
      afterward, confirmed 0 leftover artworks after each.
- [x] 88 tests passing, typecheck clean
- [x] README's story count and §3-target disclosure updated (2 → 8)

## Resumed later this session — still 8, real search exhausted for now

Asked directly to chase 2 more stories toward §3's "at least 10." Four new research
methods tried against the full 334-object corpus, beyond ticket 09/16's title-text and AIC
description-field passes:

- [x] Scanned `PhysicalObject.rawRecord` (full raw API JSON, real since ticket 27) for
      phrase hits (`pendant`, `diptych`, `triptych`, `study for`, `cast of`, `copy after`,
      etc.) — 35 hits. Every one was either already published (the same ukiyo-e series),
      a false positive (`"L'Indépendant"` containing the substring `pendant`), a single
      accessioned multi-panel object (a real diptych/triptych *is* one `PhysicalObject`,
      not two linkable ones — confirmed live for the Van Eyck diptych and Patinir
      triptych), or a historically real pendant whose companion isn't in our corpus and
      isn't traceable to a Met/AIC holding (§8: can't cite a third, unverified source).
- [x] Scanned `OwnershipEvent`/`ExhibitionEvent` description text (real since ticket 25)
      the same way — 9 hits, same outcome: named companions ("Flageolet Player," "portrait
      of a young warrior," an unnamed "no. 234") checked against our own corpus and AIC's
      live search API — none held by Met or AIC today, so none can be linked without going
      outside our verified sources.
- [x] Wikidata SPARQL, `P3634`/`P4610` (Met/AIC ID) cross-check against our own 334
      objects: any two of ours sharing a `P179` (part of the series) value, or any direct
      statement between two of our own Wikidata items. Real, new finding: two more AIC
      accessions of Hokusai's "Great Wave" (89503, 24645) already in our corpus, never
      linked to anything — confirmed live against AIC's API (same title/date/medium,
      distinct artwork IDs; AIC genuinely holds three separate impressions).
- [x] Published: each new Great Wave impression linked to "Shower Below the Summit" as
      `same_series` (real — same named series, different image), and the three Great Wave
      impressions linked to each other as `print_impression` instead of `same_series` —
      §4's more precise type for multiple impressions of one identical print, first real
      use of that relationship type in the catalogue.
- [x] Net result: 38 → 43 edges, but **still 8 distinct stories** — the new edges enriched
      the already-counted Hokusai cluster rather than forming a new one. No second story
      found this pass either.
- [x] 130 tests still passing, typecheck clean. README's "8" stands — genuinely re-checked,
      not stale, and no honest path to 10 found without either a new source (outside §8's
      Met/AIC/Europeana list already exhausted for these leads) or a specific new
      acquisition ingest, the way ticket 09's grainstack expansion did.

## Resumed again — 8 → 12, §3's "at least 10" met

The corpus had grown past 334 works since the last pass (576 in the local dev DB at the
time), so the series-title survey was re-run against it first.

- [x] Re-ran the `"series"` title survey and listed every match with its current
      relationship count. Found nine never-linked works whose AIC title states series
      membership. Each candidate was re-checked live against `api.artic.edu` before
      anything was published.
- [x] **Salvator Rosa, "Figurine" series** (AIC 86, 87): both etchings were already in
      the corpus and unlinked. Each AIC title ends "from Figurine series". Published as a
      `same_series` pair, so no ingest was needed. This is the first non-Japanese series
      story.
- [x] **Hokusai, "One Hundred Ghost Tales (Hyaku monogatari)"**: Kohada Koheiji (47398)
      was already in the corpus. A live AIC search for the series returned five AIC-held
      prints, all titled "from the series ...", all 1831-32. Ingested Oiwa (47403) to
      form the pair.
- [x] **Hokusai, "Unusual Views of Famous Bridges in Various Provinces (Shokoku meikyo
      kiran)"**: Togetsu Bridge (3652) was already in the corpus. Ingested Kintai Bridge
      in Suo Province (25175), which has the same series title, c. 1833/34 date and oban
      format.
- [x] **Hiroshige, "Fifty-three Stations of the Tokaido ... also known as the Hoeido
      Tokaido"**: Mishima: Morning Mist (10926) was already in the corpus. Ingested
      Kanbara: Evening Snow (25613), whose AIC title also names the Hoeido Tokaido. It is
      kept separate from the already-published "Tokaido with Poem" clique because AIC
      gives it a different edition and a different series title. It was not merged on
      the strength of a similar name.
- [x] Enrichment, not a new story: Hara (2914), Hokusai's c. 1806 chuban Tokaido print,
      was added to the existing Hokusai Tokaido clique (4 new edges). It shares the
      series title, date and format with Odawara, Sakanoshita, Shinagawa and Fuchu.
- [x] Not published: Utamaro's "Elegant Comparison of Little Treasures" (Goldfish),
      Harunobu's untitled "Thirty-six Immortal Poets" (Ise) and Hokusai's untitled
      "Large Flowers" series (Chrysanthemum and Horsefly) are each still single members.
      They are left for a later pass. Four new stories was already past the target.
- [x] Net: 43 → 51 edges, **8 → 12 distinct stories** (counted as connected components
      of the relationship graph in the local dev DB).
- [x] Verified live on a local `next dev` pointed at the local docker DB. Note that `next
      dev` otherwise loads `.env.local`, which points at the Neon database, not the
      docker one the scripts write to. The Rosa, Oiwa, Kintai Bridge and Mishima pages
      each show 1 documented related piece with the right series text and an AIC source
      link. Hara shows 4.
- [x] 145 tests passing, typecheck clean. README story count updated (8 → 12).
