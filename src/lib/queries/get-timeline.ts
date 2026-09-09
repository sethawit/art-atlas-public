import type { PrismaClient } from "@prisma/client";

export interface TimelineEntry {
  artworkId: string;
  slug: string;
  title: string;
  artistName: string | null;
  dateDisplay: string;
  precision: string | null;
  placeOrCulture: string | null;
  medium: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface TimelineCentury {
  centuryStart: number | null; // null = undated bucket
  label: string;
  entries: TimelineEntry[];
}

export interface TimelineFilters {
  placeOrCulture?: string;
  medium?: string;
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
 *
 * Ticket 24 (Phase 2, "interactive" per §3) adds optional place/medium filters — the
 * same real fields §5's "What else was happening then?" already reads
 * (`Artwork.placeOrCulture`, `PhysicalObject.medium`), generalized from one artwork's
 * page to the whole timeline so a filtered view genuinely narrows what's shown, not a
 * client-side visual effect over the same unfiltered data.
 */
export async function getTimeline(prisma: PrismaClient, filters: TimelineFilters = {}): Promise<TimelineCentury[]> {
  const assertions = await prisma.assertion.findMany({
    where: { subjectType: "Artwork", field: "creationDate", isPreferred: true },
    select: { subjectId: true, value: true, precision: true, valueEarliest: true },
  });

  const artworkIds = assertions.map((a) => a.subjectId);
  const artworks = await prisma.artwork.findMany({
    where: {
      id: { in: artworkIds },
      ...(filters.placeOrCulture ? { placeOrCulture: filters.placeOrCulture } : {}),
      ...(filters.medium ? { physicalObjects: { some: { medium: { contains: filters.medium, mode: "insensitive" } } } } : {}),
    },
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
      placeOrCulture: artwork.placeOrCulture,
      medium: artwork.physicalObjects[0]?.medium ?? null,
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

/** Real, distinct filter values for the timeline's place/medium dropdowns — no dead options. */
export async function getTimelineFilterOptions(prisma: PrismaClient) {
  const [places, mediums] = await Promise.all([
    prisma.artwork.findMany({
      where: { placeOrCulture: { not: null } },
      select: { placeOrCulture: true },
      distinct: ["placeOrCulture"],
      orderBy: { placeOrCulture: "asc" },
    }),
    prisma.physicalObject.findMany({
      where: { medium: { not: null } },
      select: { medium: true },
      distinct: ["medium"],
      orderBy: { medium: "asc" },
    }),
  ]);
  return {
    places: places.map((p) => p.placeOrCulture!).filter(Boolean),
    mediums: mediums.map((m) => m.medium!).filter(Boolean),
  };
}
