import { afterEach, describe, expect, it, vi } from "vitest";
import { aicImageUrl } from "@/lib/aic/client";

// Mock Blob so these tests never touch the real store; the curl fetch is injected per test.
vi.mock("@vercel/blob", () => {
  class BlobNotFoundError extends Error {}
  return { head: vi.fn(), put: vi.fn(), BlobNotFoundError };
});

const { head, put, BlobNotFoundError } = await import("@vercel/blob");
const { blobPathnameFor, blobPathnameForSourceUrl, cacheAicImage } = await import("@/lib/images/aic-blob-cache");

afterEach(() => {
  vi.mocked(head).mockReset();
  vi.mocked(put).mockReset();
});

const withToken = () => true;
const okImage = async () => ({
  ok: true,
  status: 200,
  contentType: "image/jpeg",
  body: Buffer.from("fake-image-bytes"),
});

describe("blobPathnameFor", () => {
  it("builds a deterministic pathname from image id and width — the proxy route looks up exactly this", () => {
    expect(blobPathnameFor("abc-123", "843")).toBe("aic-images/abc-123-843.jpg");
  });

  it("derives the same pathname from a full AIC IIIF URL", () => {
    expect(blobPathnameForSourceUrl(aicImageUrl("abc-123"))).toBe("aic-images/abc-123-843.jpg");
  });

  it("returns null for URLs that aren't an AIC IIIF image", () => {
    expect(blobPathnameForSourceUrl("https://www.artic.edu/artworks/28560")).toBeNull();
    expect(blobPathnameForSourceUrl("not a url")).toBeNull();
  });
});

describe("cacheAicImage", () => {
  it("uploads to Blob under the proxy's pathname when the image isn't cached yet", async () => {
    vi.mocked(head).mockRejectedValueOnce(new BlobNotFoundError());
    const fetchImage = vi.fn(okImage);

    const result = await cacheAicImage(aicImageUrl("abc-123"), { fetchImage, hasToken: withToken });

    expect(result).toEqual({ status: "cached", pathname: "aic-images/abc-123-843.jpg" });
    expect(fetchImage).toHaveBeenCalledWith(aicImageUrl("abc-123"));
    expect(put).toHaveBeenCalledWith(
      "aic-images/abc-123-843.jpg",
      Buffer.from("fake-image-bytes"),
      expect.objectContaining({ access: "public", addRandomSuffix: false, contentType: "image/jpeg" })
    );
  });

  it("skips the fetch when the image is already in Blob", async () => {
    vi.mocked(head).mockResolvedValueOnce({ url: "https://blob.example/aic-images/abc-123-843.jpg" } as never);
    const fetchImage = vi.fn(okImage);

    const result = await cacheAicImage(aicImageUrl("abc-123"), { fetchImage, hasToken: withToken });

    expect(result.status).toBe("already-present");
    expect(fetchImage).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("reports AIC's own 403/404 as a failure instead of throwing, and stores nothing", async () => {
    vi.mocked(head).mockRejectedValueOnce(new BlobNotFoundError());
    const fetchImage = vi.fn(async () => ({ ok: false, status: 404, contentType: "text/plain", body: Buffer.alloc(0) }));

    const result = await cacheAicImage(aicImageUrl("gone"), { fetchImage, hasToken: withToken });

    expect(result).toEqual({ status: "failed", pathname: "aic-images/gone-843.jpg", reason: "AIC returned 404" });
    expect(put).not.toHaveBeenCalled();
  });

  it("reports a Blob upload error as a failure instead of throwing", async () => {
    vi.mocked(head).mockRejectedValueOnce(new BlobNotFoundError());
    vi.mocked(put).mockRejectedValueOnce(new Error("blob down"));

    const result = await cacheAicImage(aicImageUrl("abc-123"), { fetchImage: okImage, hasToken: withToken });

    expect(result).toMatchObject({ status: "failed", reason: "blob down" });
  });

  it("does nothing without a Blob token, so ingest still works in environments that don't cache", async () => {
    const fetchImage = vi.fn(okImage);

    const result = await cacheAicImage(aicImageUrl("abc-123"), { fetchImage, hasToken: () => false });

    expect(result).toEqual({ status: "skipped-no-token" });
    expect(head).not.toHaveBeenCalled();
    expect(fetchImage).not.toHaveBeenCalled();
  });

  it("ignores URLs that aren't an AIC IIIF image", async () => {
    const result = await cacheAicImage("https://images.metmuseum.org/x.jpg", { fetchImage: okImage, hasToken: withToken });
    expect(result).toEqual({ status: "unparsed" });
  });
});
