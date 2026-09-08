// Usage: npx tsx scripts/ingest-aic-artwork.ts <artworkID>
import { prisma } from "@/lib/prisma";
import { ingestAicArtwork } from "@/lib/ingest/ingest-aic-artwork";

const artworkId = Number(process.argv[2]);
if (!Number.isInteger(artworkId)) {
  console.error("Usage: npx tsx scripts/ingest-aic-artwork.ts <artworkID>");
  process.exit(1);
}

const result = await ingestAicArtwork(prisma, artworkId);
console.log(`Ingested "${result.artwork.title}" -> /artwork/${result.artwork.slug}`);
console.log(`Source: ${result.sourceUrl}`);
await prisma.$disconnect();
