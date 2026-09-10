import { put } from "@vercel/blob";
import { IIIF_FETCH_REFERER, IIIF_FETCH_USER_AGENT } from "@/lib/aic/client";

/**
 * Ticket 31 follow-up: fetch an AIC IIIF image once and store our own copy in object
 * storage (Vercel Blob), returning its public URL.
 *
 * This must run from an IP AIC's Cloudflare protection doesn't block — confirmed live
 * (ticket 31) that a Referer alone isn't enough from Vercel's own iad1 function IP range,
 * so this cannot run inside a Vercel serverless function (the image-proxy route, or a
 * request handler). It's meant to be called from ingestion (a dev machine / CI runner,
 * same as the rest of the ingest pipeline, which already works from a non-blocked IP —
 * see ingest-aic-artwork.ts) or the one-off backfill script (scripts/cache-aic-images.ts).
 *
 * Once cached, the stored blob URL is served directly on every render — no further
 * requests to AIC, so the blocked-IP problem never resurfaces for that image.
 *
 * `blobPath` should be stable per ImageAsset (e.g. `aic-images/<imageAsset.id>.jpg`) so
 * re-running this against the same asset overwrites rather than accumulating orphans.
 */
export async function cacheAicImage(sourceUrl: string, blobPath: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set — provision a Vercel Blob store and set this env var before caching AIC images."
    );
  }

  const upstream = await fetch(sourceUrl, {
    headers: { referer: IIIF_FETCH_REFERER, "user-agent": IIIF_FETCH_USER_AGENT },
  });
  if (!upstream.ok) {
    throw new Error(`AIC image fetch failed: ${upstream.status} for ${sourceUrl}`);
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const bytes = await upstream.arrayBuffer();

  const blob = await put(blobPath, Buffer.from(bytes), {
    access: "public",
    contentType,
    // Stable path per image (see docstring) — overwrite in place rather than Vercel's
    // default of appending a random suffix per upload.
    addRandomSuffix: false,
  });

  return blob.url;
}
