// Usage: npx tsx scripts/backfill-place-or-culture.ts
// Re-ingests every already-known artwork through the real pipeline so
// Artwork.placeOrCulture (added after the original 69-item corpus was ingested) gets
// backfilled from data the source APIs already returned. Idempotent — reuses the exact
// same adapters/normalizers as first ingestion, keyed off each PhysicalObject's stored
// externalRecordUrl. Respects AIC's rate limit the same way bulk-ingest.ts does.
import { prisma } from "@/lib/prisma";
import { ingestMetArtwork } from "@/lib/ingest/ingest-met-artwork";
import { ingestAicArtwork } from "@/lib/ingest/ingest-aic-artwork";

const AIC_REQUEST_SPACING_MS = 1100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const physicalObjects = await prisma.physicalObject.findMany({
  where: { externalRecordUrl: { not: null } },
  select: { externalRecordUrl: true },
});

let metCount = 0;
let aicCount = 0;
let failed = 0;

for (const po of physicalObjects) {
  const url = po.externalRecordUrl!;
  try {
    if (url.includes("metmuseum.org")) {
      const objectId = Number(url.split("/").pop());
      await ingestMetArtwork(prisma, objectId);
      metCount++;
    } else if (url.includes("artic.edu")) {
      const artworkId = Number(url.split("/").pop());
      await sleep(AIC_REQUEST_SPACING_MS);
      await ingestAicArtwork(prisma, artworkId);
      aicCount++;
    } else {
      console.warn(`Unrecognized source URL, skipped: ${url}`);
    }
  } catch (err) {
    failed++;
    console.error(`Failed to re-ingest ${url}: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`Backfill complete: ${metCount} Met, ${aicCount} AIC, ${failed} failed.`);

const withPlaceOrCulture = await prisma.artwork.count({ where: { placeOrCulture: { not: null } } });
const total = await prisma.artwork.count();
console.log(`Artworks with placeOrCulture: ${withPlaceOrCulture} / ${total}`);

await prisma.$disconnect();
