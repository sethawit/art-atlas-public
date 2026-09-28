import type { PrismaClient } from "@prisma/client";
import { searchMetObjectIds } from "@/lib/met/client";
import { searchAicArtworkIds } from "@/lib/aic/client";
import { ingestMetArtwork } from "@/lib/ingest/ingest-met-artwork";
import { ingestAicArtwork } from "@/lib/ingest/ingest-aic-artwork";

const MET_SOURCE_NAME = "Met Collection API";
const AIC_SOURCE_NAME = "Art Institute of Chicago API";

// AIC's documented ceiling is 60 req/min (source register) — space calls comfortably
// under that. The Met has no enforced limit (80 req/s advisory), so no delay there.
const AIC_REQUEST_SPACING_MS = 1100;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await sleep(1000);
    return fn(); // one retry; a second failure propagates and is logged by the caller
  }
}

export interface BulkIngestSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  duplicatesFlagged: number;
  withoutEligibleImage: number;
  /** AIC images that couldn't be cached in Blob during ingest (failed, or no token set). */
  aicImagesNotCached: number;
}

/**
 * Gather candidate public-domain object ids from both sources across a curated set of
 * search terms, then ingest each through the existing single-object adapters (tickets 03,
 * 04) — this function adds volume, retry, rate-limit spacing, and IngestLog rows; it
 * doesn't duplicate the fetch/normalize/write logic itself.
 */
export async function bulkIngest(
  prisma: PrismaClient,
  {
    searchTerms,
    targetPerSource,
  }: { searchTerms: string[]; targetPerSource: number }
): Promise<BulkIngestSummary> {
  const summary: BulkIngestSummary = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    duplicatesFlagged: 0,
    withoutEligibleImage: 0,
    aicImagesNotCached: 0,
  };

  const metIds = await collectMetIds(searchTerms, targetPerSource);
  for (const objectId of metIds) {
    summary.attempted++;
    try {
      const result = await withRetry(() => ingestMetArtwork(prisma, objectId));
      summary.succeeded++;
      if (result.duplicateFlagged) summary.duplicatesFlagged++;
      await logIngest(prisma, {
        sourceName: MET_SOURCE_NAME,
        externalId: String(objectId),
        status: result.duplicateFlagged ? "flagged_duplicate" : "success",
        message: result.duplicateFlagged ? "Slug collision — see DuplicateFlag" : undefined,
        artworkId: result.artwork.id,
      });
    } catch (err) {
      summary.failed++;
      await logIngest(prisma, {
        sourceName: MET_SOURCE_NAME,
        externalId: String(objectId),
        status: "failure",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const aicIds = await collectAicIds(searchTerms, targetPerSource);
  for (const artworkId of aicIds) {
    summary.attempted++;
    await sleep(AIC_REQUEST_SPACING_MS);
    try {
      const result = await withRetry(() => ingestAicArtwork(prisma, artworkId));
      summary.succeeded++;
      if (result.imageCache?.status === "failed" || result.imageCache?.status === "skipped-no-token") {
        summary.aicImagesNotCached++;
      }
      if (result.duplicateFlagged) summary.duplicatesFlagged++;
      await logIngest(prisma, {
        sourceName: AIC_SOURCE_NAME,
        externalId: String(artworkId),
        status: result.duplicateFlagged ? "flagged_duplicate" : "success",
        message: result.duplicateFlagged ? "Slug collision — see DuplicateFlag" : undefined,
        artworkId: result.artwork.id,
      });
    } catch (err) {
      summary.failed++;
      await logIngest(prisma, {
        sourceName: AIC_SOURCE_NAME,
        externalId: String(artworkId),
        status: "failure",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  summary.withoutEligibleImage = await countWithoutEligibleImage(prisma);
  return summary;
}

async function collectMetIds(searchTerms: string[], target: number): Promise<number[]> {
  const ids = new Set<number>();
  for (const term of searchTerms) {
    if (ids.size >= target) break;
    const { objectIDs } = await searchMetObjectIds(term, { limit: 25 });
    for (const id of objectIDs ?? []) {
      if (ids.size >= target) break;
      ids.add(id);
    }
  }
  return Array.from(ids);
}

async function collectAicIds(searchTerms: string[], target: number): Promise<number[]> {
  const ids = new Set<number>();
  for (const term of searchTerms) {
    if (ids.size >= target) break;
    await sleep(AIC_REQUEST_SPACING_MS);
    const { data } = await searchAicArtworkIds(term, { limit: 15 });
    for (const { id } of data) {
      if (ids.size >= target) break;
      ids.add(id);
    }
  }
  return Array.from(ids);
}

async function logIngest(
  prisma: PrismaClient,
  entry: { sourceName: string; externalId: string; status: string; message?: string; artworkId?: string }
) {
  await prisma.ingestLog.create({ data: entry });
}

async function countWithoutEligibleImage(prisma: PrismaClient): Promise<number> {
  const total = await prisma.artwork.count();
  const withImage = await prisma.artwork.findMany({
    select: { id: true, physicalObjects: { select: { images: { where: { removedAt: null }, take: 1 } } } },
  });
  const missing = withImage.filter((a) => a.physicalObjects.every((po) => po.images.length === 0)).length;
  return Math.min(missing, total);
}
