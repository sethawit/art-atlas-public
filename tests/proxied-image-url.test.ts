import { describe, expect, it } from "vitest";
import { aicImageUrl, aicArtworkPageUrl } from "@/lib/aic/client";
import { proxiedImageUrl } from "@/lib/images/proxied-image-url";

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
