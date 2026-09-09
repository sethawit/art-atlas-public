import { afterAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { cleanupByRunId } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import { getTimeline } from "@/lib/queries/get-timeline";

const runId = newRunId();

afterAll(async () => {
  await cleanupByRunId(prisma, runId);
  await prisma.$disconnect();
});

async function seedDatedArtwork(slug: string, title: string, year: number | null, sourceId: string) {
  const artwork = await prisma.artwork.create({ data: { slug: `${slug}-${runId}`, title } });
  if (year !== null) {
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
  } else {
    // Undated bucket case: a preferred creationDate assertion with no sortable range
    // (mirrors safeYearDate's BC-date handling in normalize-met.ts).
    await prisma.assertion.create({
      data: {
        subjectType: "Artwork",
        subjectId: artwork.id,
        field: "creationDate",
        value: "ca. 2300 BCE",
        sourceId,
        retrievedAt: new Date(),
        isPreferred: true,
      },
    });
  }
  return artwork;
}

describe("getTimeline", () => {
  it("groups artworks into century buckets, including 11th/12th/13th and 21st-suffix edge cases", async () => {
    const source = await prisma.source.create({ data: { name: `Timeline Test Source ${runId}`, url: "https://example.org" } });

    await seedDatedArtwork("t-11c", `Eleventh Century Work ${runId}`, 1050, source.id);
    await seedDatedArtwork("t-12c", `Twelfth Century Work ${runId}`, 1150, source.id);
    await seedDatedArtwork("t-13c", `Thirteenth Century Work ${runId}`, 1250, source.id);
    await seedDatedArtwork("t-21c", `Twenty First Century Work ${runId}`, 2010, source.id);
    await seedDatedArtwork("t-undated", `Undated Work ${runId}`, null, source.id);

    const centuries = await getTimeline(prisma);
    const byLabel = new Map(centuries.map((c) => [c.label, c]));

    const findEntry = (label: string, titleSuffix: string) =>
      byLabel.get(label)?.entries.find((e) => e.title.includes(titleSuffix));

    expect(findEntry("11th century", `Eleventh Century Work ${runId}`)).toBeTruthy();
    expect(findEntry("12th century", `Twelfth Century Work ${runId}`)).toBeTruthy();
    expect(findEntry("13th century", `Thirteenth Century Work ${runId}`)).toBeTruthy();
    expect(findEntry("21st century", `Twenty First Century Work ${runId}`)).toBeTruthy();

    const undatedBucket = byLabel.get("Undated in our records");
    expect(undatedBucket?.entries.some((e) => e.title.includes(`Undated Work ${runId}`))).toBe(true);
  });

  it("orders centuries chronologically ascending, with the undated bucket last", async () => {
    const centuries = await getTimeline(prisma);
    const datedCenturies = centuries.filter((c) => c.centuryStart !== null);
    const starts = datedCenturies.map((c) => c.centuryStart as number);
    const sorted = [...starts].sort((a, b) => a - b);
    expect(starts).toEqual(sorted);

    const lastEntry = centuries[centuries.length - 1];
    const hasUndated = centuries.some((c) => c.centuryStart === null);
    if (hasUndated) expect(lastEntry.centuryStart).toBeNull();
  });
});
