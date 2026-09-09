# 16 — More related-piece stories (toward §3's "at least 10")

**What to build:** More verified `Relationship` rows, researched and published the same
way ticket 09 did (institutional catalogues, Wikidata SPARQL where useful, never inferred
from matching titles alone). Current count: 2 distinct stories (a 7-work Monet clique + 1
documented-influence pair). Target: at least 10.

**Blocked by:** none — same tooling as ticket 09 (`npm run relationships:publish`),
possibly needs `npm run ingest:bulk`/targeted single-object ingest first if a promising
series/pair isn't in the corpus yet (ticket 09's own Stacks-of-Wheat expansion did this).

**Status:** planned

- [ ] Research candidate themes: repeated subjects across the current 69 (or a grown)
      corpus — series, preparatory studies, pendant pairs, documented influence — per §4's
      candidate list (Sunflowers, Water Lilies, studies connected to a finished painting)
      plus whatever the actual corpus supports once looked at directly, not assumed
- [ ] For each candidate: confirm via a real citation (museum catalogue entry, scholarly
      publication) before publishing — never merge or link on title/appearance alone
- [ ] Publish via `relationships:publish`, using distinct relationship types where the
      evidence supports it (currently only `same_series` and `documented_influence` have
      real rows — `preparatory_study`, `pendant_companion`, `print_impression`,
      `cast_from_model`, `copy_after` all have zero; don't force a type the evidence
      doesn't support just for variety)
- [ ] Update README's story count and the §3-target disclosure once done
- [ ] Consider whether corpus growth (ticket 18) needs to happen first/alongside — more
      of a known series (e.g. all AIC-held Cathedral or Grainstack paintings) may already
      be sitting outside the current 69-artwork slice, same as ticket 09 found
