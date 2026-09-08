import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

// Ticket 02 acceptance: "Seed-and-read round-trip test passes for each entity."
// Each entity is written once, read back, and checked against what was written —
// proving the migrations produce a schema the app can actually round-trip through.

// Unique per test run so repeated `vitest run` against a persistent dev database
// doesn't collide on slug/accessionNumber uniqueness constraints.
const runId = Date.now().toString(36);

afterAll(async () => {
  await prisma.$disconnect();
});

describe("core data model round-trip", () => {
  it("writes and reads back every Phase 1 entity with its relationships intact", async () => {
    const source = await prisma.source.create({
      data: { name: "Met Collection API", url: "https://metmuseum.github.io/" },
    });
    expect(source.id).toBeTruthy();

    const artist = await prisma.artist.create({
      data: { slug: `vincent-van-gogh-${runId}`, name: "Vincent van Gogh" },
    });

    const institution = await prisma.institution.create({
      data: { slug: `met-${runId}`, name: "The Metropolitan Museum of Art", city: "New York" },
    });

    const movement = await prisma.movementStyle.create({
      data: { slug: `post-impressionism-${runId}`, name: "Post-Impressionism", kind: "movement" },
    });

    const artwork = await prisma.artwork.create({
      data: {
        slug: `starry-night-${runId}`,
        title: "The Starry Night",
        artistId: artist.id,
        movements: { create: [{ movementId: movement.id }] },
      },
    });

    const physicalObject = await prisma.physicalObject.create({
      data: {
        artworkId: artwork.id,
        institutionId: institution.id,
        accessionNumber: `TEST.${runId}`,
        medium: "Oil on canvas",
        dimensions: "73.7 cm × 92.1 cm",
      },
    });

    const image = await prisma.imageAsset.create({
      data: {
        physicalObjectId: physicalObject.id,
        sourceUrl: "https://example.org/starry-night.jpg",
        credit: "Public domain",
        altText: "Swirling night sky over a village, The Starry Night by Vincent van Gogh",
      },
    });

    // A field-level Assertion with the display-text + sortable-range + precision shape
    // required for creation-date fields.
    const assertion = await prisma.assertion.create({
      data: {
        subjectType: "Artwork",
        subjectId: artwork.id,
        field: "creationDate",
        value: "1889",
        valueEarliest: new Date("1889-01-01"),
        valueLatest: new Date("1889-12-31"),
        precision: "exact",
        sourceId: source.id,
        retrievedAt: new Date(),
        isPreferred: true,
        selectionReason: "Single source, undisputed.",
      },
    });

    // --- read back ---

    const readArtwork = await prisma.artwork.findUniqueOrThrow({
      where: { id: artwork.id },
      include: { artist: true, physicalObjects: { include: { images: true, institution: true } }, movements: { include: { movement: true } } },
    });

    expect(readArtwork.title).toBe("The Starry Night");
    expect(readArtwork.artist?.name).toBe("Vincent van Gogh");
    expect(readArtwork.movements[0]?.movement.name).toBe("Post-Impressionism");

    // The physical object carries its own identifiers/dimensions, distinct from the
    // artwork/concept it belongs to.
    expect(readArtwork.physicalObjects).toHaveLength(1);
    const readObject = readArtwork.physicalObjects[0];
    expect(readObject.accessionNumber).toBe(`TEST.${runId}`);
    expect(readObject.dimensions).toBe("73.7 cm × 92.1 cm");
    expect(readObject.institution?.name).toBe("The Metropolitan Museum of Art");
    expect(readObject.images[0]?.sourceUrl).toBe("https://example.org/starry-night.jpg");

    const readAssertion = await prisma.assertion.findUniqueOrThrow({ where: { id: assertion.id } });
    expect(readAssertion.value).toBe("1889");
    expect(readAssertion.precision).toBe("exact");
    expect(readAssertion.valueEarliest?.getUTCFullYear()).toBe(1889);
    expect(readAssertion.isPreferred).toBe(true);

    // A second, conflicting Assertion on the same subject/field must coexist —
    // Assertion supports multiple competing values per field, not a single overwrite.
    const conflictingAssertion = await prisma.assertion.create({
      data: {
        subjectType: "Artwork",
        subjectId: artwork.id,
        field: "creationDate",
        value: "c. 1888–1889",
        precision: "approximate",
        sourceId: source.id,
        retrievedAt: new Date(),
        isPreferred: false,
        selectionReason: "Secondary source, less specific.",
      },
    });

    const allDateAssertions = await prisma.assertion.findMany({
      where: { subjectType: "Artwork", subjectId: artwork.id, field: "creationDate" },
    });
    expect(allDateAssertions.map((a) => a.id).sort()).toEqual(
      [assertion.id, conflictingAssertion.id].sort()
    );
  });
});
