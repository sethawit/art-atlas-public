import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { cleanupByRunId } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import { getJourney } from "@/lib/queries/get-journey";

const runId = newRunId();

afterAll(async () => {
  await cleanupByRunId(prisma, runId);
  await prisma.$disconnect();
});

let withJourney: { id: string };
let withoutJourney: { id: string };

beforeAll(async () => {
  const source = await prisma.source.create({ data: { name: `Journey Test Source ${runId}`, url: `https://example.org/${runId}` } });

  const artworkA = await prisma.artwork.create({ data: { slug: `journey-a-${runId}`, title: `Journey A ${runId}` } });
  withJourney = await prisma.physicalObject.create({ data: { artworkId: artworkA.id } });
  await prisma.ownershipEvent.create({
    data: { physicalObjectId: withJourney.id, sequence: 1, description: "Second owner", sourceId: source.id, retrievedAt: new Date() },
  });
  await prisma.ownershipEvent.create({
    data: { physicalObjectId: withJourney.id, sequence: 0, description: "First owner", sourceId: source.id, retrievedAt: new Date() },
  });
  await prisma.exhibitionEvent.create({
    data: { physicalObjectId: withJourney.id, sequence: 0, description: "One exhibition", sourceId: source.id, retrievedAt: new Date() },
  });

  const artworkB = await prisma.artwork.create({ data: { slug: `journey-b-${runId}`, title: `Journey B ${runId}` } });
  withoutJourney = await prisma.physicalObject.create({ data: { artworkId: artworkB.id } });

  await prisma.ownershipEvent.create({
    data: {
      physicalObjectId: withJourney.id,
      sequence: 2,
      description: "Flagged owner",
      sourceId: source.id,
      retrievedAt: new Date(),
      reviewStatus: "flagged",
    },
  });
});

describe("getJourney", () => {
  it("returns ownership events ordered by sequence, not insertion order", async () => {
    const result = await getJourney(prisma, withJourney.id);
    expect(result.ownership.map((e) => e.description)).toEqual(["First owner", "Second owner"]);
  });

  it("includes real source attribution on each event", async () => {
    const result = await getJourney(prisma, withJourney.id);
    expect(result.ownership[0].sourceName).toContain("Journey Test Source");
  });

  it("returns exhibitions separately from ownership", async () => {
    const result = await getJourney(prisma, withJourney.id);
    expect(result.exhibitions.map((e) => e.description)).toEqual(["One exhibition"]);
  });

  it("returns empty arrays, not an error, for a physical object with no journey data", async () => {
    const result = await getJourney(prisma, withoutJourney.id);
    expect(result.ownership).toEqual([]);
    expect(result.exhibitions).toEqual([]);
  });

  it("excludes flagged events from the public result", async () => {
    const result = await getJourney(prisma, withJourney.id);
    expect(result.ownership.some((e) => e.description === "Flagged owner")).toBe(false);
    expect(result.ownership).toHaveLength(2);
  });
});
