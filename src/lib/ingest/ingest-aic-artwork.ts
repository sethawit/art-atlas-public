import type { PrismaClient } from "@prisma/client";
import { fetchAicArtwork } from "@/lib/aic/client";
import { normalizeAicArtwork } from "@/lib/ingest/normalize-aic";
import { writeNormalizedArtwork } from "@/lib/ingest/write-normalized-artwork";
import { writeProvenanceAndExhibitionEvents } from "@/lib/provenance/write-provenance-events";
import { cacheAicImage } from "@/lib/images/cache-aic-image";

const SOURCE = { name: "Art Institute of Chicago API", url: "https://api.artic.edu/api/v1" };

/**
 * Fetch one AIC artwork by id and write it into the core data model. Same shared write
 * path as the Met adapter (write-normalized-artwork.ts) — ticket 04 proves that path and
 * the artwork page generalize across a second source without a fork.
 *
 * Provenance/exhibition events (ticket 25) are written separately, after the shared
 * path — they're AIC-only real fields, not part of the generic NormalizedArtwork shape
 * both sources produce, and they key off physicalObject.id which only exists once the
 * shared write has run.
 */
export async function ingestAicArtwork(prisma: PrismaClient, artworkId: number) {
  const raw = await fetchAicArtwork(artworkId);
  const normalized = normalizeAicArtwork(raw);

  // Ticket 31 follow-up: cache the image now, while ingestion is running from an IP AIC
  // doesn't block (the same reason live proxying from Vercel doesn't work — see
  // src/lib/images/cache-aic-image.ts). Never let a caching failure fail the whole
  // ingest — the render path still falls back to the (currently broken-in-prod) live
  // proxy via resolveImageUrl, so this is a real regression risk, not a hard requirement.
  if (normalized.image) {
    try {
      normalized.image.cachedUrl = await cacheAicImage(normalized.image.sourceUrl, `aic-images/${artworkId}.jpg`);
    } catch (err) {
      console.warn(`[ingest-aic] failed to cache image for artwork ${artworkId}:`, err);
    }
  }

  const result = await writeNormalizedArtwork(prisma, normalized, SOURCE);

  await writeProvenanceAndExhibitionEvents(
    prisma,
    result.physicalObject.id,
    { provenanceText: raw.provenance_text, exhibitionHistory: raw.exhibition_history },
    SOURCE
  );

  return result;
}
