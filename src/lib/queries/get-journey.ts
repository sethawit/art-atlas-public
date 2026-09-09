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
 *
 * Excludes reviewStatus "flagged" rows — an admin's way to hide one specific segment
 * they've found to be wrong (§9 item 7's provenance review requirement), without
 * deleting it or gating the whole feature behind pre-approval (see the schema comment
 * on OwnershipEvent for why "unreviewed" still shows).
 */
export async function getJourney(prisma: PrismaClient, physicalObjectId: string): Promise<Journey> {
  const [ownershipRows, exhibitionRows] = await Promise.all([
    prisma.ownershipEvent.findMany({
      where: { physicalObjectId, reviewStatus: { not: "flagged" } },
      include: { source: true },
      orderBy: { sequence: "asc" },
    }),
    prisma.exhibitionEvent.findMany({
      where: { physicalObjectId, reviewStatus: { not: "flagged" } },
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
