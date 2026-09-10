import { head, BlobNotFoundError } from "@vercel/blob";

// Proxies AIC (Art Institute of Chicago) IIIF images.
//
// CONFIRMED ROOT CAUSE (ticket 31 — do not re-diagnose, evidence trail is there):
// AIC's image CDN sits behind Cloudflare, which serves a static "Attention Required"
// WAF block page (cf-ray present, server: cloudflare, no cf-mitigated/JS-challenge
// header — a network/ASN-level firewall rule, not a bot-score heuristic) to requests
// originating from Vercel's serverless compute — confirmed live via this route's own
// upstream response body. The identical request, with identical headers, succeeds from
// a residential/dev-sandbox IP. No request header can satisfy a network-level block.
//
// THE FIX (ticket 31's "Option 2"): fetch each AIC image once from a network AIC
// doesn't block — `scripts/cache-aic-images.ts`, run from a dev machine, not Vercel —
// and store it in Vercel Blob under a deterministic pathname derived from the image's
// own IIIF id/width. This route now checks Blob first and redirects there when present;
// it only falls back to a live AIC fetch (which will still 403 from Vercel's compute)
// for an image that hasn't been backfilled yet — e.g. one from a very recent ingest run
// that hasn't had `npm run cache:aic-images` run against it. The live-fetch fallback and
// its Referer/allowlist stay for that reason, and because they document a legitimate
// request even where it doesn't clear the network block.
//
// AIC publishes this IIIF endpoint specifically for third-party embedding (that's what
// IIIF is for), and its images are CC0/open access, already rights-cleared in this
// project's source register.
//
// Strict allowlist below (protocol + hostname + path prefix, checked after URL parsing,
// not a naive string prefix match) keeps this from becoming an open SSRF proxy.
export const preferredRegion = ["fra1", "lhr1", "sin1", "hnd1"];

const ALLOWED_HOSTNAME = "www.artic.edu";
const ALLOWED_PATH_PREFIX = "/iiif/2/";
const OUTBOUND_REFERER = "https://www.artic.edu/";
const OUTBOUND_USER_AGENT = "ArtAtlasImageProxy/1.0 (contact via repo)";

// Matches e.g. /iiif/2/20692004-784b-.../full/843,/0/default.jpg — captures the image id
// and requested width, the same two values scripts/cache-aic-images.ts keys its Blob
// pathnames by. Exported so that script stays byte-for-byte in sync with this route
// instead of two independently-maintained copies of the same regex/pathname scheme.
const IIIF_PATH_PATTERN = /^\/iiif\/2\/([^/]+)\/full\/([^,/]+),\/0\/default\.jpg$/;

export function blobPathnameFor(imageId: string, width: string): string {
  return `aic-images/${imageId}-${width}.jpg`;
}

export async function GET(request: Request): Promise<Response> {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) {
    return Response.json({ error: "missing url parameter" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return Response.json({ error: "invalid url parameter" }, { status: 400 });
  }

  if (
    target.protocol !== "https:" ||
    target.hostname !== ALLOWED_HOSTNAME ||
    !target.pathname.startsWith(ALLOWED_PATH_PREFIX)
  ) {
    return Response.json({ error: "unsupported image URL" }, { status: 400 });
  }

  const match = target.pathname.match(IIIF_PATH_PATTERN);
  if (match) {
    const [, imageId, width] = match;
    try {
      const blob = await head(blobPathnameFor(imageId, width));
      return Response.redirect(blob.url, 302);
    } catch (err) {
      // Not backfilled yet (or a transient Blob-side issue) — fall through to the live
      // AIC fetch below rather than failing the request outright.
      if (!(err instanceof BlobNotFoundError)) {
        console.error("image-proxy: Blob head() failed unexpectedly", err);
      }
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: { referer: OUTBOUND_REFERER, "user-agent": OUTBOUND_USER_AGENT },
    });
  } catch {
    return Response.json({ error: "upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok) {
    if (upstream.status >= 500) {
      return Response.json({ error: "upstream server error" }, { status: 502 });
    }
    // Propagate the exact upstream status (e.g. 403, 404) rather than masking it —
    // honest about what actually happened, and matches this project's disclosure ethos.
    return Response.json({ error: `upstream returned ${upstream.status}` }, { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      // Matches AIC's own origin cache-control — we're relaying their caching policy,
      // not inventing a longer one. This is also what lets Vercel's edge serve repeat
      // requests for the same image without re-fetching from AIC.
      "cache-control": "public, max-age=2592000, no-transform",
    },
  });
}
