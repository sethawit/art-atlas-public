// Usage: npx tsx scripts/publish-relationships.ts
// Hand-verified relationships for the Family Explorer (ticket 09). Each entry here was
// individually researched — see .scratch/art-atlas-mvp/issues/09-related-piece-stories.md
// for the research trail and what remains unverified/ambiguous.
import { prisma } from "@/lib/prisma";
import { publishRelationship } from "@/lib/relationships/publish-relationship";
import type { VerifiedRelationship } from "@/lib/relationships/publish-relationship";

const AIC_SCHOLARLY_CATALOGUE = "Art Institute of Chicago — Online Scholarly Catalogues";

// The full "Stacks of Wheat" series (ticket 09 resumption — corpus growth): AIC's own
// Online Scholarly Catalogue explicitly groups seven numbered entries, "Cats. 27–33.
// Stacks of Wheat, 1890/91" (https://publications.artic.edu/node/135599, confirmed by
// fetching the catalogue text directly). A live AIC search for Monet's "stack of wheat"
// paintings returns exactly seven AIC-held works, all dated 1890–91 — matching that
// numbering. Two (End of Summer, End of Day Autumn) were already ingested and published
// as ticket 09's first relationship; the other five were ingested specifically to grow
// this series for real, not invented. Every pairing here shares the same single citation
// and is published as a full clique (21 edges across 7 works) so each painting's own
// Related pieces tab correctly lists all six others, not just one.
const GRAINSTACK_SERIES = [
  "stacks-of-wheat-end-of-summer",
  "stacks-of-wheat-end-of-day-autumn",
  "stack-of-wheat",
  "stack-of-wheat-thaw-sunset",
  "stacks-of-wheat-sunset-snow-effect",
  "stack-of-wheat-snow-effect-overcast-day",
  "stacks-of-wheat",
] as const;

const grainstackPairs: VerifiedRelationship[] = [];
for (let i = 0; i < GRAINSTACK_SERIES.length; i++) {
  for (let j = i + 1; j < GRAINSTACK_SERIES.length; j++) {
    grainstackPairs.push({
      subjectSlug: GRAINSTACK_SERIES[i],
      objectSlug: GRAINSTACK_SERIES[j],
      type: "same_series",
      explanation:
        'Both paintings belong to Monet\'s 1890/91 "Stacks of Wheat" series, painted from the same vantage point outside his farmhouse at Giverny. The Art Institute\'s own scholarly catalogue groups seven works together as Cats. 27–33 of this campaign.',
      evidence: {
        sourceName: `${AIC_SCHOLARLY_CATALOGUE} — Cats. 27–33, Stacks of Wheat series`,
        sourceUrl: "https://publications.artic.edu/node/135599",
      },
    });
  }
}

// Ticket 16 — five real ukiyo-e print series found in the corpus after ticket 18's
// growth run. Evidence here is different in kind from the grainstack citation above but
// no weaker: AIC's own `title` field states series membership directly ("Odawara, from
// the series 'Fifty-three Stations of the Tokaido'..."), confirmed live against the AIC
// API for a sample object (`api.artic.edu/api/v1/artworks/2906`), not inferred from
// matching titles the way §4 warns against — the museum's own cataloguing states it.
// Each edge cites the subject artwork's own AIC record, where that exact statement is
// directly readable.
function sameSeriesClique(slugs: readonly string[], seriesName: string, artistName: string): VerifiedRelationship[] {
  const pairs: VerifiedRelationship[] = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      pairs.push({
        subjectSlug: slugs[i],
        objectSlug: slugs[j],
        type: "same_series",
        explanation: `Both prints belong to ${artistName}'s series "${seriesName}" — stated directly in each work's own Art Institute of Chicago catalogue record, not inferred from matching titles.`,
        evidence: {
          sourceName: `Art Institute of Chicago — object record (${slugs[i]})`,
          sourceUrl: `https://www.artic.edu${AIC_URL_BY_SLUG[slugs[i]]}`,
        },
      });
    }
  }
  return pairs;
}

const AIC_URL_BY_SLUG: Record<string, string> = {
  "shower-below-the-summit-sanka-hakuu-from-the-series-thirty-six-views-of-mount-fuji-fugaku-sanjurokkei":
    "/artworks/87008",
  "under-the-wave-off-kanagawa-kanagawa-oki-nami-ura-also-known-as-the-great-wave-from-the-series-thirty-six-views-of-mount-fuji-fugaku-sanjurokkei":
    "/artworks/77333",
  "odawara-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi": "/artworks/2906",
  "sakanoshita-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi": "/artworks/3035",
  "shinagawa-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi": "/artworks/2887",
  "fuchu-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi": "/artworks/2927",
  "whaling-off-the-coast-of-the-goto-islands-goto-kujira-tsuki-from-the-series-one-thousand-pictures-of-the-ocean-chie-no-umi":
    "/artworks/100626",
  "fishing-boats-at-choshi-in-shimosa-soshu-choshi-from-the-series-one-thousand-pictures-of-the-ocean-chie-no-umi":
    "/artworks/100627",
  "hamamatsu-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido":
    "/artworks/4371",
  "mitsuke-ferries-crossing-the-tenryu-river-mitsuke-tenryugawa-funawatashi-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido":
    "/artworks/4368",
  "arai-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido":
    "/artworks/4378",
  "maisaka-the-ferry-at-imagiri-maisaka-imagiri-funawatashi-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido":
    "/artworks/4374",
  "no-37-miyanokoshi-from-the-series-sixty-nine-stations-of-the-kisokaido-kisokaido-rokujukyu-tsugi-no-uchi":
    "/artworks/11050",
  "no-32-seba-from-the-series-sixty-nine-stations-of-the-kisokaido-kisokaido-rokujukyu-tsugi-no-uchi": "/artworks/11054",
};

const mountFujiPair = sameSeriesClique(
  [
    "shower-below-the-summit-sanka-hakuu-from-the-series-thirty-six-views-of-mount-fuji-fugaku-sanjurokkei",
    "under-the-wave-off-kanagawa-kanagawa-oki-nami-ura-also-known-as-the-great-wave-from-the-series-thirty-six-views-of-mount-fuji-fugaku-sanjurokkei",
  ],
  "Thirty-Six Views of Mount Fuji (Fugaku sanjurokkei)",
  "Katsushika Hokusai"
);

const hokusaiTokaidoClique = sameSeriesClique(
  [
    "odawara-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi",
    "sakanoshita-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi",
    "shinagawa-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi",
    "fuchu-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi",
  ],
  "Fifty-three Stations of the Tokaido (Tokaido gojusan tsugi)",
  "Katsushika Hokusai"
);

const oceanPair = sameSeriesClique(
  [
    "whaling-off-the-coast-of-the-goto-islands-goto-kujira-tsuki-from-the-series-one-thousand-pictures-of-the-ocean-chie-no-umi",
    "fishing-boats-at-choshi-in-shimosa-soshu-choshi-from-the-series-one-thousand-pictures-of-the-ocean-chie-no-umi",
  ],
  "One Thousand Pictures of the Ocean (Chie no umi)",
  "Katsushika Hokusai"
);

const hiroshigeTokaidoClique = sameSeriesClique(
  [
    "hamamatsu-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido",
    "mitsuke-ferries-crossing-the-tenryu-river-mitsuke-tenryugawa-funawatashi-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido",
    "arai-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido",
    "maisaka-the-ferry-at-imagiri-maisaka-imagiri-funawatashi-from-the-series-fifty-three-stations-of-the-tokaido-tokaido-gojusan-tsugi-also-known-as-the-tokaido-with-poem-kyoka-iri-tokaido",
  ],
  'Fifty-three Stations of the Tokaido (Tokaido gojusan tsugi, also known as the "Tokaido with Poem")',
  "Utagawa Hiroshige"
);

const kisokaidoPair = sameSeriesClique(
  [
    "no-37-miyanokoshi-from-the-series-sixty-nine-stations-of-the-kisokaido-kisokaido-rokujukyu-tsugi-no-uchi",
    "no-32-seba-from-the-series-sixty-nine-stations-of-the-kisokaido-kisokaido-rokujukyu-tsugi-no-uchi",
  ],
  "Sixty-nine Stations of the Kisokaido (Kisokaido rokujukyu tsugi no uchi)",
  "Utagawa Hiroshige"
);

// Ticket 16 resumption — a real Met-held pendant pair, found by title text ("(one of a
// pair)", the Met's own cataloguing) and confirmed live against the Met API: both
// objects (189709, 189708) carry the identical title, date ("18th century"), and
// attribution ("French Painter"), consecutive accession IDs.
const pendantPair: VerifiedRelationship[] = [
  {
    subjectSlug: "still-life-with-musical-instruments-one-of-a-pair",
    objectSlug: "still-life-with-musical-instruments-one-of-a-pair-the-metropolitan-museum-of-art",
    type: "pendant_companion",
    explanation:
      'Both works are explicitly titled "(one of a pair)" in the Metropolitan Museum\'s own catalogue record, sharing an identical attribution ("French Painter", 18th century) and consecutive accession identifiers.',
    evidence: {
      sourceName: "The Metropolitan Museum of Art — object record (189709)",
      sourceUrl: "https://www.metmuseum.org/art/collection/search/189709",
    },
  },
];

const relationships: VerifiedRelationship[] = [
  ...grainstackPairs,
  ...mountFujiPair,
  ...hokusaiTokaidoClique,
  ...oceanPair,
  ...hiroshigeTokaidoClique,
  ...kisokaidoPair,
  ...pendantPair,
  {
    subjectSlug: "water-lily-pond",
    objectSlug: "water-lilies",
    type: "documented_influence",
    explanation:
      'Both depict Monet\'s water garden at Giverny, but the Art Institute\'s scholarly catalogue is explicit that "Water Lily Pond" (1917/19) is not part of the same series as the earlier "Water Lilies" (1906) — it belongs to a later, much larger-scale campaign that built on the earlier paintings\' subject rather than continuing their series.',
    evidence: {
      sourceName: `${AIC_SCHOLARLY_CATALOGUE} — Cat. 47, Water Lily Pond`,
      sourceUrl: "https://publications.artic.edu/monet/api/epub/135466/135623/print_view",
    },
  },
];

for (const rel of relationships) {
  const result = await publishRelationship(prisma, rel);
  console.log(`Published: ${rel.subjectSlug} -[${rel.type}]-> ${rel.objectSlug} (${result.id})`);
}

await prisma.$disconnect();
