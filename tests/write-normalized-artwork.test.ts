import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { writeNormalizedArtwork } from "@/lib/ingest/write-normalized-artwork";
import type { NormalizedArtwork } from "@/lib/ingest/normalize-met";

afterAll(async () => {
  await prisma.$disconnect();
});

const runId = Date.now().toString(36);
const SOURCE_A = { name: `Source A ${runId}`, url: "https://a.example.org" };
const SOURCE_B = { name: `Source B ${runId}`, url: "https://b.example.org" };

function normalizedFixture(overrides: Partial<NormalizedArtwork> = {}): NormalizedArtwork {
  return {
    slug: `self-portrait-${runId}`,
    title: `Self-Portrait ${runId}`,
    artist: { slug: `test-artist-${runId}`, name: "Test Artist" },
    institution: { slug: `institution-a-${runId}`, name: "Institution A", city: "City A" },
    physicalObject: { accessionNumber: "A.1", medium: "Oil on canvas", dimensions: "10 x 10 cm" },
    image: null,
    assertions: [],
    sourceUrl: `https://a.example.org/objects/1-${runId}`,
    ...overrides,
  };
}

describe("writeNormalizedArtwork — identity and re-ingest", () => {
  it("re-ingesting the same externalRecordUrl updates the existing PhysicalObject rather than creating a second one", async () => {
    const first = normalizedFixture();
    const r1 = await writeNormalizedArtwork(prisma, first, SOURCE_A);
    expect(r1.duplicateFlagged).toBe(false);

    const updated = normalizedFixture({ physicalObject: { ...first.physicalObject, dimensions: "20 x 20 cm" } });
    const r2 = await writeNormalizedArtwork(prisma, updated, SOURCE_A);

    expect(r2.artwork.id).toBe(r1.artwork.id);
    expect(r2.physicalObject.id).toBe(r1.physicalObject.id);
    expect(r2.physicalObject.dimensions).toBe("20 x 20 cm");

    const count = await prisma.physicalObject.count({ where: { artworkId: r1.artwork.id } });
    expect(count).toBe(1);
  });
});

describe("writeNormalizedArtwork — slug collision safety", () => {
  it("never merges two different physical objects that share a title-slug", async () => {
    const slug = `sunflowers-${runId}`;

    const fromA = normalizedFixture({
      slug,
      title: "Sunflowers",
      institution: { slug: `museum-a-${runId}`, name: "Museum A", city: "City A" },
      physicalObject: { accessionNumber: "A.100", medium: "Oil on canvas", dimensions: "90 x 70 cm" },
      sourceUrl: `https://a.example.org/objects/100-${runId}`,
    });
    const fromB = normalizedFixture({
      slug,
      title: "Sunflowers",
      institution: { slug: `museum-b-${runId}`, name: "Museum B", city: "City B" },
      physicalObject: { accessionNumber: "B.200", medium: "Oil on canvas", dimensions: "95 x 73 cm" },
      sourceUrl: `https://b.example.org/objects/200-${runId}`,
    });

    const resultA = await writeNormalizedArtwork(prisma, fromA, SOURCE_A);
    expect(resultA.duplicateFlagged).toBe(false);

    const resultB = await writeNormalizedArtwork(prisma, fromB, SOURCE_B);
    expect(resultB.duplicateFlagged).toBe(true);

    // Two distinct Artwork rows, not one merged/overwritten row.
    expect(resultB.artwork.id).not.toBe(resultA.artwork.id);
    expect(resultB.artwork.slug).not.toBe(resultA.artwork.slug);
    expect(resultB.artwork.slug.startsWith(slug)).toBe(true);

    // Neither PhysicalObject was overwritten by the other.
    const objA = await prisma.physicalObject.findUnique({ where: { id: resultA.physicalObject.id } });
    const objB = await prisma.physicalObject.findUnique({ where: { id: resultB.physicalObject.id } });
    expect(objA?.accessionNumber).toBe("A.100");
    expect(objB?.accessionNumber).toBe("B.200");

    // A pending DuplicateFlag links the two for human review.
    const flag = await prisma.duplicateFlag.findFirst({
      where: {
        OR: [
          { artworkAId: resultA.artwork.id, artworkBId: resultB.artwork.id },
          { artworkAId: resultB.artwork.id, artworkBId: resultA.artwork.id },
        ],
      },
    });
    expect(flag).not.toBeNull();
    expect(flag?.status).toBe("pending");
  });
});

describe("writeNormalizedArtwork — assertion history and preference", () => {
  it("marks the first observation of a field as preferred and a later competing one as not", async () => {
    const withBio = normalizedFixture({
      slug: `artist-with-bio-${runId}`,
      sourceUrl: `https://a.example.org/objects/bio-${runId}`,
      assertions: [{ field: "artistBio", value: "Born in City A." }],
    });
    await writeNormalizedArtwork(prisma, withBio, SOURCE_A);

    const conflicting = normalizedFixture({
      slug: `artist-with-bio-${runId}`,
      sourceUrl: `https://a.example.org/objects/bio-${runId}`, // same object, re-ingested
      assertions: [{ field: "artistBio", value: "Born in a different city, per a second pass." }],
    });
    const result = await writeNormalizedArtwork(prisma, conflicting, SOURCE_B);

    const rows = await prisma.assertion.findMany({
      where: { subjectType: "Artwork", subjectId: result.artwork.id, field: "artistBio" },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0].isPreferred).toBe(true);
    expect(rows[1].isPreferred).toBe(false);
  });

  it("does not duplicate an assertion row when the same source re-observes an unchanged value", async () => {
    const artwork = normalizedFixture({
      slug: `unchanged-${runId}`,
      sourceUrl: `https://a.example.org/objects/unchanged-${runId}`,
      assertions: [{ field: "styleTitle", value: "Post-Impressionism" }],
    });
    const r1 = await writeNormalizedArtwork(prisma, artwork, SOURCE_A);
    await writeNormalizedArtwork(prisma, artwork, SOURCE_A); // identical re-ingest

    const rows = await prisma.assertion.findMany({
      where: { subjectType: "Artwork", subjectId: r1.artwork.id, field: "styleTitle" },
    });
    expect(rows).toHaveLength(1);
  });
});
