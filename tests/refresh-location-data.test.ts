import { afterAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { cleanupByRunId } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import { refreshLocationData } from "@/lib/ingest/refresh-location-data";

const runId = newRunId();

afterAll(async () => {
  await cleanupByRunId(prisma, runId);
  await prisma.$disconnect();
});

const SOURCE = { name: `Refresh Test Source ${runId}`, url: `https://example.org/${runId}` };

async function seedPhysicalObject(slug: string) {
  const artwork = await prisma.artwork.create({
    data: { slug: `${slug}-${runId}`, title: `Refresh Test ${runId}` },
  });
  return prisma.physicalObject.create({
    data: { artworkId: artwork.id, medium: "Oil on canvas", dimensions: "10 x 10 cm", accessionNumber: "R.1" },
  });
}

describe("refreshLocationData", () => {
  it("derives on_display from a real gallery location", async () => {
    const po = await seedPhysicalObject("refresh-a");
    const result = await refreshLocationData(prisma, po.id, "Gallery 900", SOURCE);
    expect(result.displayStatus).toBe("on_display");

    const updated = await prisma.physicalObject.findUniqueOrThrow({ where: { id: po.id } });
    expect(updated.displayStatus).toBe("on_display");
    expect(updated.galleryLocation).toBe("Gallery 900");
  });

  it("stays unconfirmed, never not_on_display, when no gallery location is given", async () => {
    const po = await seedPhysicalObject("refresh-b");
    const result = await refreshLocationData(prisma, po.id, null, SOURCE);
    expect(result.displayStatus).toBe("unconfirmed");

    const updated = await prisma.physicalObject.findUniqueOrThrow({ where: { id: po.id } });
    expect(updated.galleryLocation).toBeNull();
  });

  it("does not touch medium, dimensions, or accessionNumber — only the changeable fields", async () => {
    const po = await seedPhysicalObject("refresh-c");
    await refreshLocationData(prisma, po.id, "Gallery 100", SOURCE);

    const updated = await prisma.physicalObject.findUniqueOrThrow({ where: { id: po.id } });
    expect(updated.medium).toBe("Oil on canvas");
    expect(updated.dimensions).toBe("10 x 10 cm");
    expect(updated.accessionNumber).toBe("R.1");
  });

  it("writes a real LocationAssertion with verified status and the gallery location cited", async () => {
    const po = await seedPhysicalObject("refresh-d");
    await refreshLocationData(prisma, po.id, "Gallery 700", SOURCE);

    const row = await prisma.locationAssertion.findFirstOrThrow({
      where: { physicalObjectId: po.id, field: "displayStatus" },
    });
    expect(row.verificationStatus).toBe("verified");
    expect(row.sourceStatement).toContain("Gallery 700");
  });

  it("is idempotent: refreshing twice updates rather than duplicates the LocationAssertion row", async () => {
    const po = await seedPhysicalObject("refresh-e");
    await refreshLocationData(prisma, po.id, "Gallery 1", SOURCE);
    await refreshLocationData(prisma, po.id, "Gallery 2", SOURCE);

    const rows = await prisma.locationAssertion.findMany({
      where: { physicalObjectId: po.id, field: "displayStatus" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe("on_display");

    const updated = await prisma.physicalObject.findUniqueOrThrow({ where: { id: po.id } });
    expect(updated.galleryLocation).toBe("Gallery 2");
  });
});
