// Usage: npx tsx scripts/ingest-met-artwork.ts <objectID>
import { prisma } from "@/lib/prisma";
import { ingestMetArtwork } from "@/lib/ingest/ingest-met-artwork";

const objectId = Number(process.argv[2]);
if (!Number.isInteger(objectId)) {
  console.error("Usage: npx tsx scripts/ingest-met-artwork.ts <objectID>");
  process.exit(1);
}

const result = await ingestMetArtwork(prisma, objectId);
console.log(`Ingested "${result.artwork.title}" -> /artwork/${result.artwork.slug}`);
console.log(`Source: ${result.sourceUrl}`);
await prisma.$disconnect();
