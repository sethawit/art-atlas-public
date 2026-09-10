// Proxies AIC (Art Institute of Chicago) IIIF images.
//
// CONFIRMED ROOT CAUSE (ticket 31 — do not re-diagnose, evidence trail is there):
// AIC's image CDN sits behind Cloudflare, which serves a static "Attention Required"
// WAF block page (cf-ray present, server: cloudflare, no cf-mitigated/JS-challenge
// header — a network/ASN-level firewall rule, not a bot-score heuristic) to requests
// originating from Vercel's serverless compute — confirmed live via this route's own
// upstream response body. The identical request, with identical headers, succeeds from
// a residential/dev-sandbox IP. The determining factor is the source IP's ASN (a
// cloud/hosting-provider range), not the Referer or User-Agent below — no header this
// route sends can pass a network-level firewall rule.
//
// This means **this proxy does not currently fix the live broken-image bug** for any
// request it serves from Vercel's own compute, in any region — `preferredRegion` doesn't
// help, since every Vercel region is still a cloud-hosting ASN. The code stays: it's a
// correct, legitimate building block (see ticket 31's "Option 2" — fetching once from a
// non-blocked network at ingestion time and serving our own cached copy is the actual
// fix, a separate and larger change, not done here), and the Referer/allowlist below
// document a legitimate request even though it doesn't currently clear the block.
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
