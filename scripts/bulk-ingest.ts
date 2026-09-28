// Usage: npx tsx scripts/bulk-ingest.ts [targetPerSource] [searchTerm...]
// Pulls up to targetPerSource (default 30) public-domain artworks from each of the Met
// and AIC across a curated set of search terms, ingesting through the same adapters
// tickets 03/04 built. See .scratch/art-atlas-mvp/issues/05-bulk-ingest-admin-review.md.
import { prisma } from "@/lib/prisma";
import { bulkIngest } from "@/lib/ingest/bulk-ingest";

const targetPerSource = Number(process.argv[2]) || 30;
const customTerms = process.argv.slice(3);

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

const summary = await bulkIngest(prisma, { searchTerms, targetPerSource });

console.log("Bulk ingest complete:");
console.log(`  Attempted: ${summary.attempted}`);
console.log(`  Succeeded: ${summary.succeeded}`);
console.log(`  Failed: ${summary.failed}`);
console.log(`  Flagged as possible duplicates: ${summary.duplicatesFlagged}`);
console.log(`  Artworks without an eligible image: ${summary.withoutEligibleImage}`);
console.log(`  AIC images not cached in Blob: ${summary.aicImagesNotCached}`);
if (summary.aicImagesNotCached > 0) {
  console.log("    Run npm run cache:aic-images to retry them (needs BLOB_READ_WRITE_TOKEN).");
}

const totalArtworks = await prisma.artwork.count();
console.log(`  Total artworks in catalogue: ${totalArtworks}`);
if (totalArtworks < 200) {
  console.log(
    `  NOTE: Phase 1 target is 200–500 verified artworks; this run reached ${totalArtworks}. Shortfall reported honestly per ticket 05's acceptance criteria — run again with a higher target or more search terms to grow the corpus.`
  );
}

await prisma.$disconnect();
