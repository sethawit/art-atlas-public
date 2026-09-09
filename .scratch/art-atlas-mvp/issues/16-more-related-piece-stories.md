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
- [x] Distinct related-piece stories: 2 → **7** (still short of §3's "at least 10" —
      disclosed in README, not padded)
- [x] Verified live: `/artwork/odawara-...` correctly shows its 3 real series-mates with
      the new explanation text and a working AIC source link
- [x] 81 tests passing (no test changes needed — data-only change through the existing
      `publishRelationship` path, already covered by `publish-relationship.test.ts`),
      typecheck clean
- [x] README's story count and §3-target disclosure updated (2 → 7)
