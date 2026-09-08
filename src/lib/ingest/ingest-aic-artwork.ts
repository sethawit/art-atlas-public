import type { PrismaClient } from "@prisma/client";
import { fetchAicArtwork } from "@/lib/aic/client";
import { normalizeAicArtwork } from "@/lib/ingest/normalize-aic";
import { writeNormalizedArtwork } from "@/lib/ingest/write-normalized-artwork";

const SOURCE = { name: "Art Institute of Chicago API", url: "https://api.artic.edu/api/v1" };

/**
 * Fetch one AIC artwork by id and write it into the core data model. Same shared write
 * path as the Met adapter (write-normalized-artwork.ts) — ticket 04 proves that path and
 * the artwork page generalize across a second source without a fork.
 */
export async function ingestAicArtwork(prisma: PrismaClient, artworkId: number) {
  const raw = await fetchAicArtwork(artworkId);
  const normalized = normalizeAicArtwork(raw);
  return writeNormalizedArtwork(prisma, normalized, SOURCE);
}
