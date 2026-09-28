// Usage: npx tsx scripts/ingest-aic-artwork.ts <artworkID>
import { prisma } from "@/lib/prisma";
import { ingestAicArtwork } from "@/lib/ingest/ingest-aic-artwork";
import type { CacheAicImageResult } from "@/lib/images/aic-blob-cache";

function describeImageCache(result: CacheAicImageResult): string {
  switch (result.status) {
    case "cached":
      return `stored in Blob (${result.pathname})`;
    case "already-present":
      return `already in Blob (${result.pathname})`;
    case "skipped-no-token":
      return "skipped, BLOB_READ_WRITE_TOKEN not set — run npm run cache:aic-images later";
    case "unparsed":
      return "skipped, unexpected image URL shape";
    case "failed":
      return `failed (${result.reason}) — the site will show a placeholder for this image`;
  }
}

const artworkId = Number(process.argv[2]);
if (!Number.isInteger(artworkId)) {
  console.error("Usage: npx tsx scripts/ingest-aic-artwork.ts <artworkID>");
  process.exit(1);
}

const result = await ingestAicArtwork(prisma, artworkId);
console.log(`Ingested "${result.artwork.title}" -> /artwork/${result.artwork.slug}`);
console.log(`Source: ${result.sourceUrl}`);
if (result.imageCache) console.log(`Image cache: ${describeImageCache(result.imageCache)}`);
await prisma.$disconnect();
