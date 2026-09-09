import type { PrismaClient } from "@prisma/client";

export interface JourneyEvent {
  sequence: number;
  description: string;
  sourceName: string;
  sourceUrl: string;
  retrievedAt: Date;
}

export interface Journey {
  ownership: JourneyEvent[];
  exhibitions: JourneyEvent[];
}

/**
 * §6 "Ownership journey" (ticket 25, Phase 2). Reads the OwnershipEvent/ExhibitionEvent
 * rows written at ingest time from AIC's real provenance_text/exhibition_history fields
 * (Met has no equivalent — AIC-only, same as movement/style). Empty arrays, not an
 * error, for a Met-sourced or under-researched AIC work — most of the corpus genuinely
 * has none of this, and an empty Journey tab is the honest state, not a bug.
 */
export async function getJourney(prisma: PrismaClient, physicalObjectId: string): Promise<Journey> {
  const [ownershipRows, exhibitionRows] = await Promise.all([
    prisma.ownershipEvent.findMany({
      where: { physicalObjectId },
      include: { source: true },
      orderBy: { sequence: "asc" },
    }),
    prisma.exhibitionEvent.findMany({
      where: { physicalObjectId },
      include: { source: true },
      orderBy: { sequence: "asc" },
    }),
  ]);

  const toEvent = (row: (typeof ownershipRows)[number]): JourneyEvent => ({
    sequence: row.sequence,
    description: row.description,
    sourceName: row.source.name,
    sourceUrl: row.source.url,
    retrievedAt: row.retrievedAt,
  });

  return {
    ownership: ownershipRows.map(toEvent),
    exhibitions: exhibitionRows.map(toEvent),
  };
}
