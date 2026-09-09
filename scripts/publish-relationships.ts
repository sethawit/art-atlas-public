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

const relationships: VerifiedRelationship[] = [
  ...grainstackPairs,
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
