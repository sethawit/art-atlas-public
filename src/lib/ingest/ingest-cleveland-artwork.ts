import type { PrismaClient } from "@prisma/client";
import { fetchClevelandArtwork } from "@/lib/cleveland/client";
import { normalizeClevelandArtwork } from "@/lib/ingest/normalize-cleveland";
import { writeNormalizedArtwork } from "@/lib/ingest/write-normalized-artwork";

export const CLEVELAND_SOURCE = {
  name: "Cleveland Museum of Art Open Access API",
  url: "https://openaccess-api.clevelandart.org/api",
};

/** Fetch one Cleveland artwork by id and write it through the shared write path. */
export async function ingestClevelandArtwork(prisma: PrismaClient, artworkId: number) {
  const raw = await fetchClevelandArtwork(artworkId);
  return writeNormalizedArtwork(prisma, normalizeClevelandArtwork(raw), CLEVELAND_SOURCE);
}
