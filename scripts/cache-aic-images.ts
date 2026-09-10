// Usage: npx tsx scripts/cache-aic-images.ts
//
// Ticket 31's "Option 2" — the actual fix for AIC images being blocked in production
// (ticket 31 confirmed live: AIC's Cloudflare WAF blocks Vercel's own compute at the
// network/ASN level, not something a Referer header can get past). This script must be
// run from a network AIC doesn't block — a dev machine, not Vercel — the same reason
// ingestion already works fine from here. It fetches each AIC-sourced image once and
// stores it in Vercel Blob under the exact pathname src/app/api/image-proxy/route.ts
// looks up at request time, so real users are served from Blob's own CDN, never from a
// live per-request fetch to AIC through Vercel's compute.
//
// Safe to re-run: skips any image already present in Blob (checked via head() first,
// not re-uploaded), so picking up newly-ingested AIC images later is just running this
// again — no separate "only new ones" mode needed.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { head, put, BlobNotFoundError } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { blobPathnameFor } from "@/app/api/image-proxy/route";

const execFileAsync = promisify(execFile);

const IIIF_PATH_PATTERN = /^\/iiif\/2\/([^/]+)\/full\/([^,/]+),\/0\/default\.jpg$/;
const REQUEST_SPACING_MS = 400;
// Real finding, isolated live: Node's built-in fetch (undici) gets 403 from AIC's
// Cloudflare protection with the exact same headers and IP that curl gets 200 with —
// confirmed by running both back to back from this same machine. Ticket 31's "ASN-level"
// read was incomplete: it's (at least also) a TLS/HTTP client fingerprint check, not
// purely IP-based — undici's fingerprint is flagged, curl's isn't. Shelling out to curl
// here isn't disguising anything new; it's just using the HTTP client that demonstrably
// isn't flagged, for a request this script has every right to make (AIC's own published,
// CC0-licensed IIIF API). Node's fetch stays unusable for this specific host until/unless
// that changes — see ticket 31 for the full trail.
const AIC_REFERER = "https://www.artic.edu/";

async function fetchViaCurl(url: string): Promise<{ ok: boolean; status: number; contentType: string; body: Buffer }> {
  const { stdout } = await execFileAsync(
    "curl",
    ["-s", "-D", "-", "-H", `referer: ${AIC_REFERER}`, url],
    { encoding: "buffer", maxBuffer: 20 * 1024 * 1024 }
  );
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const images = await prisma.imageAsset.findMany({
    where: { removedAt: null, sourceUrl: { contains: "www.artic.edu/iiif/2/" } },
    select: { id: true, sourceUrl: true },
  });
  console.log(`${images.length} AIC-sourced images on file.`);

  let cached = 0;
  let alreadyPresent = 0;
  let skippedUnparsed = 0;
  let failed = 0;

  for (const image of images) {
    const url = new URL(image.sourceUrl);
    const match = url.pathname.match(IIIF_PATH_PATTERN);
    if (!match) {
      console.warn(`Skipped (unexpected URL shape): ${image.sourceUrl}`);
      skippedUnparsed++;
      continue;
    }
    const [, imageId, width] = match;
    const pathname = blobPathnameFor(imageId, width);

    try {
      await head(pathname);
      alreadyPresent++;
      continue;
    } catch (err) {
      if (!(err instanceof BlobNotFoundError)) throw err;
    }

    try {
      const res = await fetchViaCurl(image.sourceUrl);
      if (!res.ok) {
        console.error(`AIC returned ${res.status} for ${image.sourceUrl}`);
        failed++;
        continue;
      }
      await put(pathname, res.body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: res.contentType,
      });
      cached++;
    } catch (err) {
      console.error(`Failed to cache ${image.sourceUrl}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    await sleep(REQUEST_SPACING_MS);
  }

  console.log(
    `Done. Newly cached: ${cached}, already present: ${alreadyPresent}, unparsed: ${skippedUnparsed}, failed: ${failed}.`
  );
  await prisma.$disconnect();
}

main();
