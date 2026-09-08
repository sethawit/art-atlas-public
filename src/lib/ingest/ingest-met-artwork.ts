import type { PrismaClient } from "@prisma/client";
import { fetchMetObject } from "@/lib/met/client";
import { normalizeMetObject } from "@/lib/ingest/normalize-met";
import { writeNormalizedArtwork } from "@/lib/ingest/write-normalized-artwork";

const SOURCE = { name: "Met Collection API", url: "https://collectionapi.metmuseum.org/public/collection/v1" };

/**
 * Fetch one Met object by id and write it into the core data model. See
 * write-normalized-artwork.ts for the shared, idempotent write path.
 */
export async function ingestMetArtwork(prisma: PrismaClient, objectId: number) {
  const raw = await fetchMetObject(objectId);
  const normalized = normalizeMetObject(raw);
  return writeNormalizedArtwork(prisma, normalized, SOURCE);
}
