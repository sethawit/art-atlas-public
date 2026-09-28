// Usage: npx tsx scripts/cache-aic-images.ts
//
// Ticket 31's backfill for AIC images being blocked in production (AIC's Cloudflare WAF
// blocks Vercel's own compute at the network/ASN level). New AIC ingests now cache their
// own image as they're written (src/lib/ingest/ingest-aic-artwork.ts), so this script is
// for catching up: works ingested before that change, or ingested without
// BLOB_READ_WRITE_TOKEN set, or whose image failed to cache at ingest time.
//
// Must be run from a network AIC doesn't block — a dev machine, not Vercel. Stores each
// image in Vercel Blob under the pathname src/app/api/image-proxy/route.ts looks up at
// request time (shared via src/lib/images/aic-blob-cache.ts). Safe to re-run: skips any
// image already present in Blob.
import { prisma } from "@/lib/prisma";
import { cacheAicImage } from "@/lib/images/aic-blob-cache";

const REQUEST_SPACING_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set — see .env.example.");
  process.exit(1);
}

const images = await prisma.imageAsset.findMany({
  where: { removedAt: null, sourceUrl: { contains: "www.artic.edu/iiif/2/" } },
  select: { id: true, sourceUrl: true },
});
console.log(`${images.length} AIC-sourced images on file.`);

let cached = 0;
let alreadyPresent = 0;
let skippedUnparsed = 0;
let failed = 0;

for (const image of images) {
  const result = await cacheAicImage(image.sourceUrl);
  switch (result.status) {
    case "already-present":
      alreadyPresent++;
      continue;
    case "unparsed":
      console.warn(`Skipped (unexpected URL shape): ${image.sourceUrl}`);
      skippedUnparsed++;
      continue;
    case "cached":
      cached++;
      break;
    case "failed":
      console.error(`Failed to cache ${image.sourceUrl}: ${result.reason}`);
      failed++;
      break;
    case "skipped-no-token":
      // Unreachable — checked above — but keeps the switch exhaustive.
      break;
  }
  await sleep(REQUEST_SPACING_MS);
}

console.log(
  `Done. Newly cached: ${cached}, already present: ${alreadyPresent}, unparsed: ${skippedUnparsed}, failed: ${failed}.`
);
await prisma.$disconnect();
