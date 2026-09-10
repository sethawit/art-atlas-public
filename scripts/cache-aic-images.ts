// Usage: npx tsx scripts/cache-aic-images.ts
//
// Ticket 31 follow-up, one-off backfill: cache every existing AIC-sourced ImageAsset that
// doesn't have a cachedUrl yet (new ingests get this automatically — see
// ingest-aic-artwork.ts). Must run from an IP AIC's Cloudflare protection doesn't block —
// confirmed in ticket 31 that Vercel's own function IP range is blocked regardless of
// Referer, so this cannot run as a Vercel serverless function; run it the same way as the
// rest of the ingest pipeline (a dev machine / CI runner with real network egress) — and
// requires BLOB_READ_WRITE_TOKEN set in the environment (provision a Vercel Blob store
// first: https://vercel.com/docs/storage/vercel-blob).
import { prisma } from "@/lib/prisma";
import { IIIF_HOSTNAME } from "@/lib/aic/client";
import { cacheAicImage } from "@/lib/images/cache-aic-image";

const AIC_REQUEST_SPACING_MS = 1100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAicIiifUrl(sourceUrl: string): boolean {
  try {
    const parsed = new URL(sourceUrl);
    return parsed.hostname === IIIF_HOSTNAME && parsed.pathname.startsWith("/iiif/2/");
  } catch {
    return false;
  }
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set — provision a Vercel Blob store and set this env var first.");
  process.exit(1);
}

const candidates = await prisma.imageAsset.findMany({
  where: { removedAt: null, cachedUrl: null },
  include: { physicalObject: { select: { externalRecordUrl: true } } },
});

const aicImages = candidates.filter((img) => isAicIiifUrl(img.sourceUrl));

console.log(`Found ${aicImages.length} uncached AIC image(s) (of ${candidates.length} uncached total).`);

let cached = 0;
let failed = 0;

for (const img of aicImages) {
  const artworkId = Number(img.physicalObject.externalRecordUrl?.split("/").pop());
  const blobPath = Number.isFinite(artworkId) ? `aic-images/${artworkId}.jpg` : `aic-images/${img.id}.jpg`;

  try {
    await sleep(AIC_REQUEST_SPACING_MS);
    const cachedUrl = await cacheAicImage(img.sourceUrl, blobPath);
    await prisma.imageAsset.update({ where: { id: img.id }, data: { cachedUrl } });
    cached++;
  } catch (err) {
    failed++;
    console.error(`Failed to cache image ${img.id} (${img.sourceUrl}): ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`Cache backfill complete: ${cached} cached, ${failed} failed, of ${aicImages.length} AIC image(s).`);

await prisma.$disconnect();
