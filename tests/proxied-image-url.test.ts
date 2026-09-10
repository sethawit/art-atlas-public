import { describe, expect, it } from "vitest";
import { aicImageUrl, aicArtworkPageUrl } from "@/lib/aic/client";
import { proxiedImageUrl, resolveImageUrl } from "@/lib/images/proxied-image-url";

describe("proxiedImageUrl", () => {
  it("rewrites an AIC IIIF image URL to go through our own proxy", () => {
    const source = aicImageUrl("abc-123");
    expect(proxiedImageUrl(source)).toBe(`/api/image-proxy?url=${encodeURIComponent(source)}`);
  });

  it("leaves a Met image URL unchanged — Met is not affected by the AIC referer block", () => {
    const source = "https://images.metmuseum.org/CRDImages/ep/original/DP-13181-001.jpg";
    expect(proxiedImageUrl(source)).toBe(source);
  });

  it("leaves a non-IIIF www.artic.edu URL unchanged — e.g. an artwork citation page link", () => {
    const source = aicArtworkPageUrl(28560);
    expect(proxiedImageUrl(source)).toBe(source);
  });

  it("passes null and undefined through unchanged", () => {
    expect(proxiedImageUrl(null)).toBeNull();
    expect(proxiedImageUrl(undefined)).toBeUndefined();
  });

  it("passes a malformed string through unchanged rather than throwing", () => {
    expect(proxiedImageUrl("not a url")).toBe("not a url");
  });
});

describe("resolveImageUrl", () => {
  it("prefers cachedUrl over the live proxy when the image has been cached (ticket 31)", () => {
    const source = aicImageUrl("abc-123");
    const cachedUrl = "https://blob.vercel-storage.com/aic-images/28560-xyz.jpg";
    expect(resolveImageUrl({ sourceUrl: source, cachedUrl })).toBe(cachedUrl);
  });

  it("falls back to proxiedImageUrl when cachedUrl is null", () => {
    const source = aicImageUrl("abc-123");
    expect(resolveImageUrl({ sourceUrl: source, cachedUrl: null })).toBe(
      `/api/image-proxy?url=${encodeURIComponent(source)}`
    );
  });

  it("falls back to proxiedImageUrl when cachedUrl is undefined", () => {
    const source = aicImageUrl("abc-123");
    expect(resolveImageUrl({ sourceUrl: source })).toBe(`/api/image-proxy?url=${encodeURIComponent(source)}`);
  });

  it("leaves a Met image unchanged when uncached, same as proxiedImageUrl", () => {
    const source = "https://images.metmuseum.org/CRDImages/ep/original/DP-13181-001.jpg";
    expect(resolveImageUrl({ sourceUrl: source, cachedUrl: null })).toBe(source);
  });

  it("passes null and undefined through unchanged", () => {
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl(undefined)).toBeUndefined();
  });
});
