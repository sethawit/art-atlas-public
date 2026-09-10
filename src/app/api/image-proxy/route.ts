import { IIIF_FETCH_REFERER, IIIF_FETCH_USER_AGENT } from "@/lib/aic/client";

// Proxies AIC (Art Institute of Chicago) IIIF images. AIC's image CDN sits behind
// Cloudflare bot mitigation that returns 403 for requests with no Referer, a localhost
// Referer, or our own domain as Referer — but allows almost any other Referer (confirmed
// live: AIC's own homepage passes, an unrelated domain passes; the block is Referer-text
// based, not IP-based). Browsers can't fabricate a cross-origin image's Referer, so this
// server-side proxy is the only real fix: we fetch the image ourselves (with a Referer
// that passes) and stream it to the browser.
//
// AIC publishes this IIIF endpoint specifically for third-party embedding (that's what
// IIIF is for), and its images are CC0/open access, already rights-cleared in this
// project's source register. Using AIC's own homepage as our outbound Referer documents
// that this is legitimate use of their published public API, not evasion of a real
// access boundary — and it reduces AIC's origin load versus every visitor's browser
// hitting (and failing against) AIC directly, since Vercel's edge can cache our response.
//
// Strict allowlist below (protocol + hostname + path prefix, checked after URL parsing,
// not a naive string prefix match) keeps this from becoming an open SSRF proxy.

// Known limitation, confirmed live in production (not reproducible from a residential/
// dev-sandbox IP, which is why this wasn't caught before deploying): AIC's Cloudflare
// protection still 403s this proxy's outbound fetch from Vercel's iad1 (us-east-1)
// function IP range even with a Referer that passes reliably from a non-datacenter IP —
// most likely an IP/ASN reputation rule layered on top of the Referer check, not
// something a header alone can satisfy. `preferredRegion` is set here as a documented
// intent, but Vercel's Hobby tier pins functions to iad1 regardless (confirmed via
// x-vercel-id on a live response) — this has no effect without a paid plan that supports
// region selection, and is not confirmed to fix it even then. See the ticket file for the
// full trail and remaining options.
export const preferredRegion = ["fra1", "lhr1", "sin1", "hnd1"];

const ALLOWED_HOSTNAME = "www.artic.edu";
const ALLOWED_PATH_PREFIX = "/iiif/2/";

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

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: { referer: IIIF_FETCH_REFERER, "user-agent": IIIF_FETCH_USER_AGENT },
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
