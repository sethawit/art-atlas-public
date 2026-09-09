import { IIIF_HOSTNAME } from "@/lib/aic/client";

// AIC's IIIF image CDN sits behind Cloudflare bot mitigation that 403s requests with no
// Referer, a localhost Referer, or our own domain as Referer — but allows almost any
// other Referer (confirmed live: AIC's own homepage, even an unrelated domain). Browsers
// have no way to fabricate a cross-origin image's Referer, so the only real fix is
// server-side: route AIC image requests through our own proxy (src/app/api/image-proxy),
// which sets a Referer that passes. This is legitimate embedding of AIC's own published,
// CC0-licensed IIIF API — not evasion of an access boundary — see that route's own
// comment for the full reasoning.
//
// This function only decides *whether* a URL needs proxying — pure, no I/O, safe to call
// from any render path. Met images (images.metmuseum.org) are completely unaffected by
// this bug and always pass through unchanged.

/**
 * Rewrite an AIC IIIF image URL to go through our own proxy; pass every other URL
 * (Met, malformed, or anything else) through unchanged. Preserves null/undefined as-is
 * so existing `image?.sourceUrl ?? null` call sites don't need restructuring — overloads
 * below keep a non-nullable `string` input typed as a non-nullable `string` result too,
 * so a required field like `ImageAsset.sourceUrl` doesn't spuriously widen to nullable.
 */
export function proxiedImageUrl(sourceUrl: string): string;
export function proxiedImageUrl(sourceUrl: string | null | undefined): string | null | undefined;
export function proxiedImageUrl(sourceUrl: string | null | undefined): string | null | undefined {
  if (!sourceUrl) return sourceUrl;

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return sourceUrl;
  }

  // The /iiif/2/ path check matters, not just the hostname: www.artic.edu also serves
  // artwork *page* URLs (used as citation links in Journey/Sources), which must never be
  // rewritten to the image proxy.
  if (parsed.hostname !== IIIF_HOSTNAME || !parsed.pathname.startsWith("/iiif/2/")) {
    return sourceUrl;
  }

  return `/api/image-proxy?url=${encodeURIComponent(sourceUrl)}`;
}
