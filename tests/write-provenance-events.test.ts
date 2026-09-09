import { afterAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { cleanupByRunId } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import { writeProvenanceAndExhibitionEvents } from "@/lib/provenance/write-provenance-events";

const runId = newRunId();

afterAll(async () => {
  await cleanupByRunId(prisma, runId);
  await prisma.$disconnect();
});

async function seedPhysicalObject(slug: string) {
  const artwork = await prisma.artwork.create({ data: { slug: `${slug}-${runId}`, title: `Journey Test ${runId}` } });
  return prisma.physicalObject.create({ data: { artworkId: artwork.id } });
}

describe("writeProvenanceAndExhibitionEvents", () => {
  it("writes one OwnershipEvent per segment, in source order", async () => {
    const po = await seedPhysicalObject("journey-a");
    await writeProvenanceAndExhibitionEvents(
      prisma,
      po.id,
      { provenanceText: "The artist; sold to X, 1900; given to the museum, 1920.", exhibitionHistory: null },
      { name: `Test Source ${runId}`, url: `https://example.org/${runId}` }
    );

    const events = await prisma.ownershipEvent.findMany({ where: { physicalObjectId: po.id }, orderBy: { sequence: "asc" } });
    expect(events.map((e) => e.description)).toEqual(["The artist", "sold to X, 1900", "given to the museum, 1920."]);
    expect(events.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it("is idempotent: re-running with the same text doesn't duplicate rows", async () => {
    const po = await seedPhysicalObject("journey-b");
    const args = {
      provenanceText: "The artist; given to the museum, 1920.",
      exhibitionHistory: null,
    };
    const source = { name: `Test Source ${runId}`, url: `https://example.org/idempotent-${runId}` };
    await writeProvenanceAndExhibitionEvents(prisma, po.id, args, source);
    await writeProvenanceAndExhibitionEvents(prisma, po.id, args, source);

    const events = await prisma.ownershipEvent.findMany({ where: { physicalObjectId: po.id } });
    expect(events).toHaveLength(2);
  });

  it("trims leftover rows when a re-ingest produces fewer segments than before", async () => {
    const po = await seedPhysicalObject("journey-c");
    const source = { name: `Test Source ${runId}`, url: `https://example.org/shrink-${runId}` };
    await writeProvenanceAndExhibitionEvents(
      prisma,
      po.id,
      { provenanceText: "A; B; C; D.", exhibitionHistory: null },
      source
    );
    await writeProvenanceAndExhibitionEvents(
      prisma,
      po.id,
      { provenanceText: "A; B.", exhibitionHistory: null },
      source
    );

    const events = await prisma.ownershipEvent.findMany({ where: { physicalObjectId: po.id } });
    expect(events).toHaveLength(2);
  });

  it("writes ExhibitionEvents independently of OwnershipEvents", async () => {
    const po = await seedPhysicalObject("journey-d");
    await writeProvenanceAndExhibitionEvents(
      prisma,
      po.id,
      { provenanceText: null, exhibitionHistory: "Exhibition One.\n\nExhibition Two." },
      { name: `Test Source ${runId}`, url: `https://example.org/exh-${runId}` }
    );

    const ownership = await prisma.ownershipEvent.findMany({ where: { physicalObjectId: po.id } });
    const exhibitions = await prisma.exhibitionEvent.findMany({ where: { physicalObjectId: po.id }, orderBy: { sequence: "asc" } });
    expect(ownership).toHaveLength(0);
    expect(exhibitions.map((e) => e.description)).toEqual(["Exhibition One.", "Exhibition Two."]);
  });

  it("writes nothing when both fields are null", async () => {
    const po = await seedPhysicalObject("journey-e");
    await writeProvenanceAndExhibitionEvents(
      prisma,
      po.id,
      { provenanceText: null, exhibitionHistory: null },
      { name: `Test Source ${runId}`, url: `https://example.org/null-${runId}` }
    );
    const ownership = await prisma.ownershipEvent.findMany({ where: { physicalObjectId: po.id } });
    const exhibitions = await prisma.exhibitionEvent.findMany({ where: { physicalObjectId: po.id } });
    expect(ownership).toHaveLength(0);
    expect(exhibitions).toHaveLength(0);
  });
});
