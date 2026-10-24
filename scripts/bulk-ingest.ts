// Usage: npx tsx scripts/bulk-ingest.ts [--source=met,aic,cleveland] [targetPerSource] [searchTerm...]
// Pulls up to targetPerSource (default 30) public-domain artworks from each source (all
// of them unless --source narrows it) across a curated set of search terms, ingesting
// through the same per-source adapters. See .scratch/art-atlas-mvp/issues/05-bulk-ingest-admin-review.md.
import { prisma } from "@/lib/prisma";
import { bulkIngest, SOURCES } from "@/lib/ingest/bulk-ingest";

const args = process.argv.slice(2);
const sourceFlag = args.find((a) => a.startsWith("--source="));
const positional = args.filter((a) => a !== sourceFlag);
const sourceKeys = sourceFlag?.slice("--source=".length).split(",");
const unknown = sourceKeys?.filter((k) => !SOURCES.some((s) => s.key === k)) ?? [];
if (unknown.length > 0) {
  console.error(`Unknown source(s): ${unknown.join(", ")}. Known: ${SOURCES.map((s) => s.key).join(", ")}`);
  process.exit(1);
}

const targetPerSource = Number(positional[0]) || 30;
const customTerms = positional.slice(1);

// Deliberately diverse — spans several artists/subjects/museums so the run naturally
// exercises the duplicate-flag path (e.g. multiple different "Self-Portrait" works)
// rather than only ever ingesting one artist's oeuvre.
const DEFAULT_SEARCH_TERMS = [
  "van gogh",
  "monet",
  "self portrait",
  "landscape",
  "still life",
  "rembrandt",
  "hokusai",
  "degas",
];

const searchTerms = customTerms.length > 0 ? customTerms : DEFAULT_SEARCH_TERMS;

const summary = await bulkIngest(prisma, { searchTerms, targetPerSource, sourceKeys });

console.log("Bulk ingest complete:");
console.log(`  Attempted: ${summary.attempted}`);
console.log(`  Succeeded: ${summary.succeeded}`);
console.log(`  Failed: ${summary.failed}`);
console.log(`  Flagged as possible duplicates: ${summary.duplicatesFlagged}`);
console.log(`  Artworks without an eligible image: ${summary.withoutEligibleImage}`);

const totalArtworks = await prisma.artwork.count();
console.log(`  Total artworks in catalogue: ${totalArtworks}`);
if (totalArtworks < 200) {
  console.log(
    `  NOTE: Phase 1 target is 200–500 verified artworks; this run reached ${totalArtworks}. Shortfall reported honestly per ticket 05's acceptance criteria — run again with a higher target or more search terms to grow the corpus.`
  );
}

await prisma.$disconnect();
