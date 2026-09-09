import type { PrismaClient } from "@prisma/client";

export interface TimelineEntry {
  artworkId: string;
  slug: string;
  title: string;
  artistName: string | null;
  dateDisplay: string;
  precision: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface TimelineCentury {
  centuryStart: number | null; // null = undated bucket
  label: string;
  entries: TimelineEntry[];
}

function centuryLabel(centuryStart: number): string {
  const centuryNumber = Math.floor(centuryStart / 100) + 1;
  const suffix = centuryNumber % 10 === 1 && centuryNumber !== 11 ? "st" : centuryNumber % 10 === 2 && centuryNumber !== 12 ? "nd" : centuryNumber % 10 === 3 && centuryNumber !== 13 ? "rd" : "th";
  return `${centuryNumber}${suffix} century`;
}

/**
 * Chronological timeline grouped by century (§3: "establish a useful initial timeline in
 * Phase 1 if verified metadata makes it inexpensive" — it does, this is a straight read
 * over creationDate Assertions already ingested, no new data source). Works whose
 * preferred creationDate has no sortable valueEarliest (the BC-dated "Head of a ruler" —
 * see safeYearDate in normalize-met.ts) go in an explicit "Undated in our records"
 * bucket rather than being silently dropped or wrongly placed.
 */
export async function getTimeline(prisma: PrismaClient): Promise<TimelineCentury[]> {
  const assertions = await prisma.assertion.findMany({
    where: { subjectType: "Artwork", field: "creationDate", isPreferred: true },
    select: { subjectId: true, value: true, precision: true, valueEarliest: true },
  });

  const artworkIds = assertions.map((a) => a.subjectId);
  const artworks = await prisma.artwork.findMany({
    where: { id: { in: artworkIds } },
    include: {
      artist: true,
      physicalObjects: { include: { images: { where: { removedAt: null }, take: 1 } } },
    },
  });
  const artworkById = new Map(artworks.map((a) => [a.id, a]));

  const buckets = new Map<number | null, TimelineEntry[]>();
  for (const assertion of assertions) {
    const artwork = artworkById.get(assertion.subjectId);
    if (!artwork) continue;
    const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
    const entry: TimelineEntry = {
      artworkId: artwork.id,
      slug: artwork.slug,
      title: artwork.title,
      artistName: artwork.artist?.name ?? null,
      dateDisplay: assertion.value,
      precision: assertion.precision,
      imageUrl: image?.sourceUrl ?? null,
      imageAlt: image?.altText ?? null,
    };
    const centuryStart = assertion.valueEarliest ? Math.floor(assertion.valueEarliest.getUTCFullYear() / 100) * 100 : null;
    const list = buckets.get(centuryStart) ?? [];
    list.push(entry);
    buckets.set(centuryStart, list);
  }

  const centuries: TimelineCentury[] = Array.from(buckets.entries())
    .filter(([key]) => key !== null)
    .sort(([a], [b]) => (a as number) - (b as number))
    .map(([centuryStart, entries]) => ({
      centuryStart: centuryStart as number,
      label: centuryLabel(centuryStart as number),
      entries: entries.sort((a, b) => a.title.localeCompare(b.title)),
    }));

  const undated = buckets.get(null);
  if (undated && undated.length > 0) {
    centuries.push({ centuryStart: null, label: "Undated in our records", entries: undated });
  }

  return centuries;
}
