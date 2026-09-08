import { afterEach, describe, expect, it, vi } from "vitest";
import { MetApiError, fetchMetObject, searchMetObjectIds } from "@/lib/met/client";

// Mocked fetch — these test the adapter's request shape and error handling, not the live
// API itself (the live API is exercised once for real by the ingest script; see ticket
// .scratch/art-atlas-mvp/issues/03-met-ingest-single-artwork.md).

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMetObject", () => {
  it("requests the objects endpoint by id and returns the parsed body", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://collectionapi.metmuseum.org/public/collection/v1/objects/436535");
      return new Response(JSON.stringify({ objectID: 436535, title: "Wheat Field with Cypresses" }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMetObject(436535);
    expect(result.title).toBe("Wheat Field with Cypresses");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("throws MetApiError on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    await expect(fetchMetObject(999999999)).rejects.toThrow(MetApiError);
  });
});

describe("searchMetObjectIds", () => {
  it("sends offset/limit/hasImages as query params", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/public/collection/v1/search");
      expect(parsed.searchParams.get("q")).toBe("van gogh");
      expect(parsed.searchParams.get("offset")).toBe("100");
      expect(parsed.searchParams.get("limit")).toBe("50");
      expect(parsed.searchParams.get("hasImages")).toBe("true");
      return new Response(JSON.stringify({ total: 87, objectIDs: [1, 2, 3] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchMetObjectIds("van gogh", { offset: 100, limit: 50 });
    expect(result.total).toBe(87);
    expect(result.objectIDs).toEqual([1, 2, 3]);
  });

  it("throws MetApiError on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    await expect(searchMetObjectIds("anything")).rejects.toThrow(MetApiError);
  });
});
