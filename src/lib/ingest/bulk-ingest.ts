import type { PrismaClient } from "@prisma/client";
import { searchMetObjectIds } from "@/lib/met/client";
import { searchAicArtworkIds } from "@/lib/aic/client";
import { searchClevelandArtworkIds } from "@/lib/cleveland/client";
import { ingestMetArtwork } from "@/lib/ingest/ingest-met-artwork";
import { ingestAicArtwork } from "@/lib/ingest/ingest-aic-artwork";
import { CLEVELAND_SOURCE, ingestClevelandArtwork } from "@/lib/ingest/ingest-cleveland-artwork";

export const MET_SOURCE_NAME = "Met Collection API";

// AIC's documented ceiling is 60 req/min (source register) — space calls comfortably
// under that.
const AIC_REQUEST_SPACING_MS = 1100;

// Ticket 18's second growth run hit 82 real Met 403s with zero spacing on the
// assumption that the Met's 80 req/s ceiling is advisory-only and unenforced — that
// assumption was wrong in practice: something (an undocumented WAF/burst guard, not the
// published 80 req/s figure itself) throttled the burst. 200ms is ~16x under the
// advisory ceiling — still fast, but a deliberate non-zero gap this time. See ticket 32
// and scripts/retry-met-failures.ts, which recovers exactly those 82 objects.
export const MET_REQUEST_SPACING_MS = 200;

// Cleveland documents no rate limit; the Met's lesson above says not to read that as
// "unlimited", so it gets a deliberate gap too.
const CLEVELAND_REQUEST_SPACING_MS = 500;

/** One collection source: how to find candidate ids for a term, and how to ingest one. */
interface BulkSource {
  key: string;
  name: string;
  spacingMs: number;
  search(term: string): Promise<number[]>;
  ingest(prisma: PrismaClient, id: number): Promise<{ artwork: { id: string }; duplicateFlagged: boolean }>;
}

export const SOURCES: BulkSource[] = [
  {
    key: "met",
    name: MET_SOURCE_NAME,
    spacingMs: MET_REQUEST_SPACING_MS,
    search: async (term) => (await searchMetObjectIds(term, { limit: 25 })).objectIDs ?? [],
    ingest: ingestMetArtwork,
  },
  {
    key: "aic",
    name: "Art Institute of Chicago API",
    spacingMs: AIC_REQUEST_SPACING_MS,
    // 100 is AIC's documented per-page max (source register) — more candidates per
    // spaced call, not a change to call frequency/rate-limit exposure.
    search: async (term) => (await searchAicArtworkIds(term, { limit: 100 })).data.map(({ id }) => id),
    ingest: ingestAicArtwork,
  },
  {
    key: "cleveland",
    name: CLEVELAND_SOURCE.name,
    spacingMs: CLEVELAND_REQUEST_SPACING_MS,
    search: (term) => searchClevelandArtworkIds(term, { limit: 50 }),
    ingest: ingestClevelandArtwork,
  },
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
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
}

/**
 * Gather candidate public-domain object ids from every source in SOURCES across a curated set of
 * search terms, then ingest each through the existing single-object adapters (tickets 03,
 * 04) — this function adds volume, retry, rate-limit spacing, and IngestLog rows; it
 * doesn't duplicate the fetch/normalize/write logic itself.
 */
export async function bulkIngest(
  prisma: PrismaClient,
  {
    searchTerms,
    targetPerSource,
    sourceKeys,
  }: { searchTerms: string[]; targetPerSource: number; sourceKeys?: string[] }
): Promise<BulkIngestSummary> {
  const summary: BulkIngestSummary = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    duplicatesFlagged: 0,
    withoutEligibleImage: 0,
  };

  // Re-ingesting a source appends a fresh round of assertions, so a run can be limited to
  // the sources that actually need it (say, only a newly added museum).
  const sources = sourceKeys ? SOURCES.filter((s) => sourceKeys.includes(s.key)) : SOURCES;
  for (const source of sources) {
    const ids = await collectIds(source, searchTerms, targetPerSource);
    for (const id of ids) {
      summary.attempted++;
      await sleep(source.spacingMs);
      try {
        const result = await withRetry(() => source.ingest(prisma, id));
        summary.succeeded++;
        if (result.duplicateFlagged) summary.duplicatesFlagged++;
        await logIngest(prisma, {
          sourceName: source.name,
          externalId: String(id),
          status: result.duplicateFlagged ? "flagged_duplicate" : "success",
          message: result.duplicateFlagged ? "Slug collision — see DuplicateFlag" : undefined,
          artworkId: result.artwork.id,
        });
      } catch (err) {
        summary.failed++;
        await logIngest(prisma, {
          sourceName: source.name,
          externalId: String(id),
          status: "failure",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  summary.withoutEligibleImage = await countWithoutEligibleImage(prisma);
  return summary;
}

async function collectIds(source: BulkSource, searchTerms: string[], target: number): Promise<number[]> {
  const ids = new Set<number>();
  for (const term of searchTerms) {
    if (ids.size >= target) break;
    await sleep(source.spacingMs);
    for (const id of await source.search(term)) {
      if (ids.size >= target) break;
      ids.add(id);
    }
  }
  return Array.from(ids);
}

export async function logIngest(
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
