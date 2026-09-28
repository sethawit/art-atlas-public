import { head, BlobNotFoundError } from "@vercel/blob";
import { blobPathnameForSourceUrl } from "@/lib/images/aic-blob-cache";

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
// doesn't block — during AIC ingest, or `scripts/cache-aic-images.ts` for older works,
// both run from a dev machine, not Vercel — and store it in Vercel Blob under a
// deterministic pathname derived from the image's own IIIF id/width
// (src/lib/images/aic-blob-cache.ts). This route checks Blob first and redirects there
// when present; it only falls back to a live AIC fetch (which will still 403 from
// Vercel's compute) for an image that isn't cached — e.g. one ingested without
// BLOB_READ_WRITE_TOKEN set, or one AIC itself 403s/404s. The page renders a placeholder
// for those (src/components/ArtworkImage.tsx). The live-fetch fallback and
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

  const pathname = blobPathnameForSourceUrl(target.toString());
  if (pathname) {
    try {
      const blob = await head(pathname);
      return Response.redirect(blob.url, 302);
    } catch (err) {
      // Not cached yet (or a transient Blob-side issue) — fall through to the live
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
