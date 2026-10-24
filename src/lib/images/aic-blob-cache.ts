import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { head, put, BlobNotFoundError } from "@vercel/blob";

// Ticket 31's cache-first fix, shared by every path that stores or serves an AIC image:
// the ingest adapter (ingest-aic-artwork.ts caches each new work's image as it's written),
// the backfill script (scripts/cache-aic-images.ts), and the proxy route
// (src/app/api/image-proxy/route.ts, which looks up the same pathname at request time).
// Keeping the pathname scheme here means the three can't drift out of sync.
//
// Caching has to run from a network AIC doesn't block — ingestion already does (a dev
// machine, not Vercel) — so doing it during ingest means a new work's image is served
// from Blob from the moment it's published, no separate backfill run needed.

// Matches e.g. /iiif/2/20692004-784b-.../full/843,/0/default.jpg — captures the image id
// and requested width, the two values Blob pathnames are keyed by.
const IIIF_PATH_PATTERN = /^\/iiif\/2\/([^/]+)\/full\/([^,/]+),\/0\/default\.jpg$/;

export function blobPathnameFor(imageId: string, width: string): string {
  return `aic-images/${imageId}-${width}.jpg`;
}

/** The Blob pathname for an AIC IIIF image URL, or null when the URL isn't that shape. */
export function blobPathnameForSourceUrl(sourceUrl: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(sourceUrl).pathname;
  } catch {
    return null;
  }
  const match = pathname.match(IIIF_PATH_PATTERN);
  if (!match) return null;
  const [, imageId, width] = match;
  return blobPathnameFor(imageId, width);
}

const execFileAsync = promisify(execFile);

// Real finding, isolated live (ticket 31): Node's built-in fetch (undici) gets 403 from
// AIC's Cloudflare protection with the exact same headers and IP that curl gets 200 with
// — a TLS/HTTP client fingerprint check, not purely IP-based. Shelling out to curl isn't
// disguising anything; it's using the HTTP client that demonstrably isn't flagged, for a
// request this project has every right to make (AIC's own published, CC0-licensed IIIF
// API). See ticket 31 for the full trail.
const AIC_REFERER = "https://www.artic.edu/";

export interface FetchedImage {
  ok: boolean;
  status: number;
  contentType: string;
  body: Buffer;
}

export async function fetchViaCurl(url: string): Promise<FetchedImage> {
  const { stdout } = await execFileAsync("curl", ["-s", "-D", "-", "-H", `referer: ${AIC_REFERER}`, url], {
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
  // -D - prints the response headers to stdout before the body, separated by a blank
  // line (CRLF CRLF) — split once to separate them from the binary body.
  const separator = Buffer.from("\r\n\r\n");
  const idx = stdout.indexOf(separator);
  const headerText = (idx >= 0 ? stdout.subarray(0, idx) : stdout).toString("utf-8");
  const body = idx >= 0 ? stdout.subarray(idx + separator.length) : Buffer.alloc(0);
  const statusLine = headerText.split("\r\n")[0] ?? "";
  const status = Number(statusLine.split(" ")[1]) || 0;
  const contentTypeLine = headerText.split("\r\n").find((line) => line.toLowerCase().startsWith("content-type:"));
  const contentType = contentTypeLine?.split(":").slice(1).join(":").trim() ?? "image/jpeg";
  return { ok: status >= 200 && status < 300, status, contentType, body };
}

export type CacheAicImageResult =
  | { status: "cached"; pathname: string }
  | { status: "already-present"; pathname: string }
  | { status: "skipped-no-token" }
  | { status: "unparsed" }
  | { status: "failed"; pathname: string; reason: string };

export interface CacheAicImageDeps {
  fetchImage?: (url: string) => Promise<FetchedImage>;
  hasToken?: () => boolean;
}

/**
 * Store one AIC image in Vercel Blob if it isn't there already. Never throws: a caching
 * failure must not fail the ingest that called it — the image just keeps degrading to the
 * placeholder until a later ingest or `npm run cache:aic-images` picks it up.
 */
export async function cacheAicImage(sourceUrl: string, deps: CacheAicImageDeps = {}): Promise<CacheAicImageResult> {
  const fetchImage = deps.fetchImage ?? fetchViaCurl;
  const hasToken = deps.hasToken ?? (() => Boolean(process.env.BLOB_READ_WRITE_TOKEN));

  const pathname = blobPathnameForSourceUrl(sourceUrl);
  if (!pathname) return { status: "unparsed" };
  if (!hasToken()) return { status: "skipped-no-token" };

  try {
    await head(pathname);
    return { status: "already-present", pathname };
  } catch (err) {
    if (!(err instanceof BlobNotFoundError)) {
      return { status: "failed", pathname, reason: errorMessage(err) };
    }
  }

  try {
    const res = await fetchImage(sourceUrl);
    if (!res.ok) return { status: "failed", pathname, reason: `AIC returned ${res.status}` };
    await put(pathname, res.body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: res.contentType,
    });
    return { status: "cached", pathname };
  } catch (err) {
    return { status: "failed", pathname, reason: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
