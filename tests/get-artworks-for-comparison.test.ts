import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { cleanupByRunId } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import { getArtworksForComparison, getPairwiseComparisonInsights } from "@/lib/queries/get-artworks-for-comparison";

const runId = newRunId();

afterAll(async () => {
  await cleanupByRunId(prisma, runId);
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

  const institution2 = await prisma.institution.create({
    data: { slug: `compare-museum-2-${runId}`, name: `Compare Museum Two ${runId}`, city: `Compare City ${runId}` },
  });

  async function seed(
    slug: string,
    title: string,
    year: number,
    opts: { medium?: string; dimensions?: string; institutionId?: string } = {}
  ) {
    const artwork = await prisma.artwork.create({ data: { slug: `${slug}-${runId}`, title, artistId: artist.id } });
    await prisma.physicalObject.create({
      data: {
        artworkId: artwork.id,
        institutionId: opts.institutionId ?? institution.id,
        medium: opts.medium ?? "Oil on canvas",
        dimensions: opts.dimensions ?? "10 x 10 cm",
      },
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
  workD = await seed("compare-d", `Compare Work D ${runId}`, 1930, {
    medium: "Watercolor",
    dimensions: "20 x 20 cm",
    institutionId: institution2.id,
  });
  workE = await seed("compare-e", `Compare Work E ${runId}`, 1940);

  await prisma.relationship.create({
    data: {
      subjectArtworkId: workA.id,
      objectArtworkId: workB.id,
      relationshipType: "documented_influence",
      explanation: "Test relationship for comparison insights.",
      evidenceSourceId: source.id,
    },
  });
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

describe("getPairwiseComparisonInsights", () => {
  it("surfaces a real documented relationship between two compared works", async () => {
    const entries = await getArtworksForComparison(prisma, [workA.slug, workB.slug]);
    const insights = await getPairwiseComparisonInsights(prisma, entries);
    expect(insights).toHaveLength(1);
    expect(insights[0].relationshipLabel).toBe("Documented influence or response");
  });

  it("reports no relationship for a pair that doesn't have one", async () => {
    const entries = await getArtworksForComparison(prisma, [workA.slug, workC.slug]);
    const insights = await getPairwiseComparisonInsights(prisma, entries);
    expect(insights[0].relationshipLabel).toBeNull();
  });

  it("lists real factual differences: medium, dimensions, date gap, institution", async () => {
    const entries = await getArtworksForComparison(prisma, [workA.slug, workD.slug]);
    const insights = await getPairwiseComparisonInsights(prisma, entries);
    const diffText = insights[0].differences.join(" | ");
    expect(diffText).toContain("Medium differs");
    expect(diffText).toContain("Documented dimensions differ");
    expect(diffText).toContain("30 years apart");
    expect(diffText).toContain("Held by different institutions");
  });

  it("reports no differences for two works with identical fields", async () => {
    const entries = await getArtworksForComparison(prisma, [workB.slug, workC.slug]);
    const insights = await getPairwiseComparisonInsights(prisma, entries);
    expect(insights[0].differences.some((d) => d.startsWith("Medium differs"))).toBe(false);
    expect(insights[0].differences.some((d) => d.startsWith("Documented dimensions differ"))).toBe(false);
  });

  it("returns one insight per pair for more than two works", async () => {
    const entries = await getArtworksForComparison(prisma, [workA.slug, workB.slug, workC.slug]);
    const insights = await getPairwiseComparisonInsights(prisma, entries);
    expect(insights).toHaveLength(3); // A-B, A-C, B-C
  });
});
