import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { prisma } from "@/lib/prisma";
import { getWhatElseWasHappening } from "@/lib/queries/get-what-else-was-happening";

const runId = newRunId();

afterAll(async () => {
  // Same accumulation bug findBySubject/findByTechnique hit: this query is CAP-sliced
  // over a year window, so leftover fixtures from earlier uncleaned runs (all seeded at
  // the same fixed years) crowd out the current run's own fixtures. Clean up by runId.
  const artworks = await prisma.artwork.findMany({ where: { slug: { endsWith: runId } } });
  const ids = artworks.map((a) => a.id);
  await prisma.assertion.deleteMany({ where: { subjectId: { in: ids } } });
  await prisma.artwork.deleteMany({ where: { id: { in: ids } } });
  await prisma.source.deleteMany({ where: { name: { endsWith: runId } } });
  await prisma.$disconnect();
});

async function seedDatedArtwork(
  slug: string,
  title: string,
  year: number,
  placeOrCulture: string | null,
  sourceId: string
) {
  const artwork = await prisma.artwork.create({ data: { slug: `${slug}-${runId}`, title, placeOrCulture } });
  await prisma.assertion.create({
    data: {
      subjectType: "Artwork",
      subjectId: artwork.id,
      field: "creationDate",
      value: String(year),
      valueEarliest: new Date(Date.UTC(year, 0, 1)),
      precision: "exact",
      sourceId,
      retrievedAt: new Date(),
      isPreferred: true,
    },
  });
  return artwork;
}

let source: { id: string };
let anchor: { id: string; slug: string };
let sameEraDifferentPlace: { id: string; slug: string };
let sameEraSamePlace: { id: string; slug: string };
let farAway: { id: string; slug: string };
let undated: { id: string; slug: string };

beforeAll(async () => {
  source = await prisma.source.create({ data: { name: `Happening Test Source ${runId}`, url: "https://example.org" } });

  // Distinct, runId-tagged placeOrCulture values — a real place name (e.g. "Japan") would
  // collide with genuine corpus artworks in the shared dev/test database, the same class
  // of bug already fixed for testMedium/subjectTags in get-looks-familiar.test.ts.
  const anchorPlace = `Anchor Place ${runId}`;
  const otherPlace = `Other Place ${runId}`;

  anchor = await seedDatedArtwork("anchor", `Anchor Work ${runId}`, 1600, anchorPlace, source.id);
  sameEraDifferentPlace = await seedDatedArtwork(
    "same-era-diff-place",
    `Same Era Different Place ${runId}`,
    1610,
    otherPlace,
    source.id
  );
  sameEraSamePlace = await seedDatedArtwork(
    "same-era-same-place",
    `Same Era Same Place ${runId}`,
    1590,
    anchorPlace,
    source.id
  );
  farAway = await seedDatedArtwork("far-away", `Far Away In Time ${runId}`, 1200, otherPlace, source.id);
  undated = await prisma.artwork.create({ data: { slug: `undated-${runId}`, title: `Undated Work ${runId}` } });
});

describe("getWhatElseWasHappening", () => {
  it("finds works dated within the window, excluding the anchor itself", async () => {
    const result = await getWhatElseWasHappening(prisma, anchor.id);
    const slugs = result.entries.map((e) => e.slug);
    expect(slugs).toContain(sameEraDifferentPlace.slug);
    expect(slugs).toContain(sameEraSamePlace.slug);
    expect(slugs).not.toContain(anchor.slug);
  });

  it("excludes works outside the window", async () => {
    const result = await getWhatElseWasHappening(prisma, anchor.id);
    expect(result.entries.some((e) => e.slug === farAway.slug)).toBe(false);
  });

  it("prioritizes a different placeOrCulture over the anchor's own", async () => {
    const result = await getWhatElseWasHappening(prisma, anchor.id);
    const diffIndex = result.entries.findIndex((e) => e.slug === sameEraDifferentPlace.slug);
    const sameIndex = result.entries.findIndex((e) => e.slug === sameEraSamePlace.slug);
    expect(diffIndex).toBeGreaterThanOrEqual(0);
    expect(sameIndex).toBeGreaterThanOrEqual(0);
    expect(diffIndex).toBeLessThan(sameIndex);
  });

  it("returns an empty result rather than throwing when the artwork has no dated assertion", async () => {
    const result = await getWhatElseWasHappening(prisma, undated.id);
    expect(result.entries).toEqual([]);
  });
});
