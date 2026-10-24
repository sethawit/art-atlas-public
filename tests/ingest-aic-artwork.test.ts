import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/aic-28560.json" with { type: "json" };

// Orchestration only: the DB writes and AIC API call are covered by their own tests, so
// they're mocked here to isolate what this file adds — caching the image after the write.
vi.mock("@/lib/aic/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/aic/client")>()),
  fetchAicArtwork: vi.fn(),
}));
vi.mock("@/lib/ingest/write-normalized-artwork", () => ({ writeNormalizedArtwork: vi.fn() }));
vi.mock("@/lib/provenance/write-provenance-events", () => ({ writeProvenanceAndExhibitionEvents: vi.fn() }));
vi.mock("@/lib/images/aic-blob-cache", () => ({ cacheAicImage: vi.fn() }));

const { fetchAicArtwork, aicImageUrl } = await import("@/lib/aic/client");
const { writeNormalizedArtwork } = await import("@/lib/ingest/write-normalized-artwork");
const { cacheAicImage } = await import("@/lib/images/aic-blob-cache");
const { ingestAicArtwork } = await import("@/lib/ingest/ingest-aic-artwork");

const prisma = {} as never;
const writeResult = { artwork: { id: "a1" }, physicalObject: { id: "p1" }, duplicateFlagged: false };

afterEach(() => vi.clearAllMocks());

describe("ingestAicArtwork — image caching", () => {
  it("caches the new work's image in Blob after writing it", async () => {
    vi.mocked(fetchAicArtwork).mockResolvedValue(fixture as never);
    vi.mocked(writeNormalizedArtwork).mockResolvedValue(writeResult as never);
    vi.mocked(cacheAicImage).mockResolvedValue({ status: "cached", pathname: "aic-images/x-843.jpg" });

    const result = await ingestAicArtwork(prisma, 28560);

    expect(cacheAicImage).toHaveBeenCalledWith(aicImageUrl(fixture.image_id), undefined);
    expect(result.imageCache).toEqual({ status: "cached", pathname: "aic-images/x-843.jpg" });
    expect(result.artwork).toEqual(writeResult.artwork);
  });

  it("still succeeds when the image can't be cached, and reports why", async () => {
    vi.mocked(fetchAicArtwork).mockResolvedValue(fixture as never);
    vi.mocked(writeNormalizedArtwork).mockResolvedValue(writeResult as never);
    vi.mocked(cacheAicImage).mockResolvedValue({ status: "failed", pathname: "p", reason: "AIC returned 403" });

    const result = await ingestAicArtwork(prisma, 28560);

    expect(result.imageCache).toMatchObject({ status: "failed", reason: "AIC returned 403" });
  });

  it("doesn't try to cache anything for a work with no open-access image", async () => {
    vi.mocked(fetchAicArtwork).mockResolvedValue({ ...fixture, is_public_domain: false } as never);
    vi.mocked(writeNormalizedArtwork).mockResolvedValue(writeResult as never);

    const result = await ingestAicArtwork(prisma, 28560);

    expect(cacheAicImage).not.toHaveBeenCalled();
    expect(result.imageCache).toBeNull();
  });
});
