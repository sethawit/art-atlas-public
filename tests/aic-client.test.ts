import { afterEach, describe, expect, it, vi } from "vitest";
import { AicApiError, aicArtworkPageUrl, aicImageUrl, fetchAicArtwork, searchAicArtworkIds } from "@/lib/aic/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAicArtwork", () => {
  it("requests the artworks endpoint with the AIC-User-Agent header and returns data", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain("/artworks/28560");
      expect((init?.headers as Record<string, string>)["AIC-User-Agent"]).toBeTruthy();
      return new Response(JSON.stringify({ data: { id: 28560, title: "The Bedroom" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAicArtwork(28560);
    expect(result.title).toBe("The Bedroom");
  });

  it("throws AicApiError on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    await expect(fetchAicArtwork(999999999)).rejects.toThrow(AicApiError);
  });
});

describe("searchAicArtworkIds", () => {
  it("sends page/limit and the public-domain filter as query params", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const parsed = new URL(url);
      expect(parsed.searchParams.get("q")).toBe("van gogh");
      expect(parsed.searchParams.get("query[term][is_public_domain]")).toBe("true");
      expect(parsed.searchParams.get("page")).toBe("2");
      expect(parsed.searchParams.get("limit")).toBe("20");
      return new Response(JSON.stringify({ pagination: { total: 62054 }, data: [{ id: 1 }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchAicArtworkIds("van gogh", { page: 2 });
    expect(result.total).toBe(62054);
    expect(result.data).toEqual([{ id: 1 }]);
  });

  it("throws AicApiError on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(searchAicArtworkIds("anything")).rejects.toThrow(AicApiError);
  });
});

describe("URL helpers", () => {
  it("builds an IIIF image URL from an image_id", () => {
    expect(aicImageUrl("abc-123")).toBe("https://www.artic.edu/iiif/2/abc-123/full/843,/0/default.jpg");
  });

  it("builds a canonical artwork page URL from an id", () => {
    expect(aicArtworkPageUrl(28560)).toBe("https://www.artic.edu/artworks/28560");
  });
});
