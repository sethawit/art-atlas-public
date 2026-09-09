import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { prisma } from "@/lib/prisma";
import { getArtworksForComparison } from "@/lib/queries/get-artworks-for-comparison";

const runId = newRunId();

afterAll(async () => {
  const artworks = await prisma.artwork.findMany({ where: { slug: { endsWith: runId } } });
  const ids = artworks.map((a) => a.id);
  await prisma.assertion.deleteMany({ where: { subjectId: { in: ids } } });
  await prisma.physicalObject.deleteMany({ where: { artworkId: { in: ids } } });
  await prisma.artwork.deleteMany({ where: { id: { in: ids } } });
  await prisma.institution.deleteMany({ where: { slug: { endsWith: runId } } });
  await prisma.artist.deleteMany({ where: { slug: { endsWith: runId } } });
  await prisma.source.deleteMany({ where: { name: { endsWith: runId } } });
  await prisma.$disconnect();
});

let workA: { id: string; slug: string };
let workB: { id: string; slug: string };
let workC: { id: string; slug: string };
let workD: { id: string; slug: string };
let workE: { id: string; slug: string };

beforeAll(async () => {
  const source = await prisma.source.create({ data: { name: `Compare Test Source ${runId}`, url: "https://example.org" } });
  const artist = await prisma.artist.create({ data: { slug: `compare-artist-${runId}`, name: `Compare Artist ${runId}` } });
  const institution = await prisma.institution.create({
    data: { slug: `compare-museum-${runId}`, name: `Compare Museum ${runId}`, city: `Compare City ${runId}` },
  });

  async function seed(slug: string, title: string, year: number) {
    const artwork = await prisma.artwork.create({ data: { slug: `${slug}-${runId}`, title, artistId: artist.id } });
    await prisma.physicalObject.create({
      data: { artworkId: artwork.id, institutionId: institution.id, medium: "Oil on canvas", dimensions: "10 x 10 cm" },
    });
    await prisma.assertion.create({
      data: {
        subjectType: "Artwork",
        subjectId: artwork.id,
        field: "creationDate",
        value: String(year),
        valueEarliest: new Date(Date.UTC(year, 0, 1)),
        precision: "exact",
        sourceId: source.id,
        retrievedAt: new Date(),
        isPreferred: true,
      },
    });
    return artwork;
  }

  workA = await seed("compare-a", `Compare Work A ${runId}`, 1900);
  workB = await seed("compare-b", `Compare Work B ${runId}`, 1910);
  workC = await seed("compare-c", `Compare Work C ${runId}`, 1920);
  workD = await seed("compare-d", `Compare Work D ${runId}`, 1930);
  workE = await seed("compare-e", `Compare Work E ${runId}`, 1940);
});

describe("getArtworksForComparison", () => {
  it("returns real fields for each requested work, in the requested order", async () => {
    const result = await getArtworksForComparison(prisma, [workB.slug, workA.slug]);
    expect(result.map((r) => r.slug)).toEqual([workB.slug, workA.slug]);
    expect(result[0].dateDisplay).toBe("1910");
    expect(result[0].medium).toBe("Oil on canvas");
    expect(result[0].institutionName).toContain("Compare Museum");
  });

  it("silently skips a slug that doesn't match a real artwork", async () => {
    const result = await getArtworksForComparison(prisma, [workA.slug, "nonexistent-slug-xyz"]);
    expect(result.map((r) => r.slug)).toEqual([workA.slug]);
  });

  it("caps at 4 works even when more are requested", async () => {
    const result = await getArtworksForComparison(prisma, [
      workA.slug,
      workB.slug,
      workC.slug,
      workD.slug,
      workE.slug,
    ]);
    expect(result).toHaveLength(4);
  });

  it("returns an empty array for an empty slug list rather than throwing", async () => {
    const result = await getArtworksForComparison(prisma, []);
    expect(result).toEqual([]);
  });

  it("deduplicates a repeated slug", async () => {
    const result = await getArtworksForComparison(prisma, [workA.slug, workA.slug]);
    expect(result).toHaveLength(1);
  });
});
