import type { PrismaClient } from "@prisma/client";
import { splitProvenanceSegments, splitExhibitionSegments } from "@/lib/provenance/parse-provenance";

interface SourceRef {
  name: string;
  url: string;
}

/**
 * Write OwnershipEvent/ExhibitionEvent rows for a PhysicalObject from AIC's raw
 * `provenance_text`/`exhibition_history` fields — idempotent (upsert by physicalObjectId
 * + sequence; a re-ingest that produces fewer segments than last time deletes the
 * now-excess higher-sequence rows rather than leaving stale ones behind).
 */
export async function writeProvenanceAndExhibitionEvents(
  prisma: PrismaClient,
  physicalObjectId: string,
  raw: { provenanceText: string | null; exhibitionHistory: string | null },
  source: SourceRef
) {
  const sourceRow =
    (await prisma.source.findFirst({ where: { url: source.url } })) ??
    (await prisma.source.create({ data: { name: source.name, url: source.url } }));

  const retrievedAt = new Date();

  if (raw.provenanceText) {
    const segments = splitProvenanceSegments(raw.provenanceText);
    for (let i = 0; i < segments.length; i++) {
      await prisma.ownershipEvent.upsert({
        where: { physicalObjectId_sequence: { physicalObjectId, sequence: i } },
        update: { description: segments[i], sourceId: sourceRow.id, retrievedAt },
        create: { physicalObjectId, sequence: i, description: segments[i], sourceId: sourceRow.id, retrievedAt },
      });
    }
    await prisma.ownershipEvent.deleteMany({ where: { physicalObjectId, sequence: { gte: segments.length } } });
  }

  if (raw.exhibitionHistory) {
    const segments = splitExhibitionSegments(raw.exhibitionHistory);
    for (let i = 0; i < segments.length; i++) {
      await prisma.exhibitionEvent.upsert({
        where: { physicalObjectId_sequence: { physicalObjectId, sequence: i } },
        update: { description: segments[i], sourceId: sourceRow.id, retrievedAt },
        create: { physicalObjectId, sequence: i, description: segments[i], sourceId: sourceRow.id, retrievedAt },
      });
    }
    await prisma.exhibitionEvent.deleteMany({ where: { physicalObjectId, sequence: { gte: segments.length } } });
  }
}
