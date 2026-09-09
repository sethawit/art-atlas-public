// Usage: npx tsx scripts/publish-relationships.ts
// Hand-verified relationships for the Family Explorer (ticket 09). Each entry here was
// individually researched — see .scratch/art-atlas-mvp/issues/09-related-piece-stories.md
// for the research trail and what remains unverified/ambiguous.
import { prisma } from "@/lib/prisma";
import { publishRelationship } from "@/lib/relationships/publish-relationship";
import type { VerifiedRelationship } from "@/lib/relationships/publish-relationship";

const AIC_SCHOLARLY_CATALOGUE = "Art Institute of Chicago — Online Scholarly Catalogues";

const relationships: VerifiedRelationship[] = [
  {
    subjectSlug: "stacks-of-wheat-end-of-summer",
    objectSlug: "stacks-of-wheat-end-of-day-autumn",
    type: "same_series",
    explanation:
      'Both paintings belong to Monet\'s 1890/91 "Stacks of Wheat" series, painted from the same vantage point outside his farmhouse at Giverny. The Art Institute\'s own scholarly catalogue groups them together (Cats. 27–33) and cross-references their shared canvas materials in technical analysis.',
    evidence: {
      sourceName: `${AIC_SCHOLARLY_CATALOGUE} — Cat. 27, Stacks of Wheat (End of Summer)`,
      sourceUrl: "https://publications.artic.edu/node/135599",
    },
  },
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
