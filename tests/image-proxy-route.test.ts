import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/image-proxy/route";
import { aicImageUrl } from "@/lib/aic/client";

afterEach(() => {
  vi.unstubAllGlobals();
});

function requestFor(url: string | null) {
  const target = new URL("http://localhost/api/image-proxy");
  if (url !== null) target.searchParams.set("url", url);
  return new Request(target);
}

describe("GET /api/image-proxy", () => {
  it("proxies a valid AIC IIIF URL, forwarding content-type and setting cache-control", async () => {
    const source = aicImageUrl("abc-123");
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(source);
      expect((init?.headers as Record<string, string>).referer).toBe("https://www.artic.edu/");
      return new Response(new Blob(["fake-image-bytes"]), { status: 200, headers: { "content-type": "image/jpeg" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(requestFor(source));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("public, max-age=2592000, no-transform");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing url parameter without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(requestFor(null));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-artic.edu host without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(requestFor("https://evil.com/iiif/2/abc-123/full/843,/0/default.jpg"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an artic.edu URL outside the iiif/2 path without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(requestFor("https://www.artic.edu/artworks/28560"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a userinfo-spoofed URL (hostname parses to something else) without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(requestFor("https://www.artic.edu@evil.com/iiif/2/abc-123/full/843,/0/default.jpg"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates an upstream 403 verbatim rather than masking it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));

    const res = await GET(requestFor(aicImageUrl("abc-123")));
    expect(res.status).toBe(403);
  });

  it("translates an upstream 500 to a 502", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));

    const res = await GET(requestFor(aicImageUrl("abc-123")));
    expect(res.status).toBe(502);
  });

  it("translates a network-level fetch failure to a 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const res = await GET(requestFor(aicImageUrl("abc-123")));
    expect(res.status).toBe(502);
  });
});
