import type { PrismaClient } from "@prisma/client";

export interface SearchFilters {
  q?: string;
  dateFrom?: number;
  dateTo?: number;
  medium?: string;
  museumSlug?: string;
  city?: string;
  displayStatus?: string;
  movementSlug?: string;
  page?: number;
}

const PAGE_SIZE = 24;

/**
 * Full Explore search (ticket 07, movement/style filter added ticket 17): six real,
 * combinable filters (creation date range, medium, museum, city, display status,
 * movement/style) plus title/artist text search with a basic spelling-tolerance
 * fallback.
 */
export async function searchArtworks(prisma: PrismaClient, filters: SearchFilters) {
  const page = Math.max(1, filters.page ?? 1);

  const textMatchIds = filters.q?.trim() ? await matchingArtworkIdsForQuery(prisma, filters.q.trim()) : null;
  const dateMatchIds =
    filters.dateFrom || filters.dateTo ? await matchingArtworkIdsForDateRange(prisma, filters.dateFrom, filters.dateTo) : null;

  // Either filter resolving to an empty set means "no possible match" — short-circuit
  // rather than let an empty `id: { in: [] }` silently behave like "no filter."
  if ((textMatchIds && textMatchIds.size === 0) || (dateMatchIds && dateMatchIds.size === 0)) {
    return { results: [], total: 0, page, pageSize: PAGE_SIZE };
  }

  const idFilter =
    textMatchIds && dateMatchIds
      ? Array.from(textMatchIds).filter((id) => dateMatchIds.has(id))
      : textMatchIds
        ? Array.from(textMatchIds)
        : dateMatchIds
          ? Array.from(dateMatchIds)
          : null;

  if (idFilter && idFilter.length === 0) {
    return { results: [], total: 0, page, pageSize: PAGE_SIZE };
  }

  const physicalObjectFilter: Record<string, unknown> = {};
  if (filters.medium) physicalObjectFilter.medium = { contains: filters.medium, mode: "insensitive" };
  if (filters.displayStatus) physicalObjectFilter.displayStatus = filters.displayStatus;
  if (filters.museumSlug || filters.city) {
    physicalObjectFilter.institution = {
      ...(filters.museumSlug ? { slug: filters.museumSlug } : {}),
      ...(filters.city ? { city: filters.city } : {}),
    };
  }
  const hasPhysicalObjectFilter = Object.keys(physicalObjectFilter).length > 0;

  const where = {
    ...(idFilter ? { id: { in: idFilter } } : {}),
    ...(hasPhysicalObjectFilter ? { physicalObjects: { some: physicalObjectFilter } } : {}),
    ...(filters.movementSlug ? { movements: { some: { movement: { slug: filters.movementSlug } } } } : {}),
  };

  const [results, total] = await Promise.all([
    prisma.artwork.findMany({
      where,
      include: {
        artist: true,
        physicalObjects: { include: { institution: true, images: { where: { removedAt: null }, take: 1 } } },
      },
      orderBy: { title: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.artwork.count({ where }),
  ]);

  return { results, total, page, pageSize: PAGE_SIZE };
}

async function matchingArtworkIdsForQuery(prisma: PrismaClient, q: string): Promise<Set<string>> {
  const exact = await prisma.artwork.findMany({
    where: {
      OR: [{ title: { contains: q, mode: "insensitive" } }, { artist: { name: { contains: q, mode: "insensitive" } } }],
    },
    select: { id: true },
  });
  if (exact.length > 0) return new Set(exact.map((a) => a.id));

  // Basic spelling tolerance: trigram similarity fallback when substring match finds
  // nothing (e.g. "munet" for "Monet"). pg_trgm enabled in the display-status-and-search
  // migration. word_similarity(), not similarity(): a short misspelled word compared
  // against a full multi-word title/name scores far lower under plain similarity() (the
  // whole strings' trigram sets differ a lot in size) — word_similarity() instead scores
  // how well the query matches the BEST-fitting substring, which is what "does this
  // typo'd word appear in the title/name" actually needs (confirmed live: similarity('Claude
  // Monet','munet')=0.19, below any sane threshold; word_similarity(same)=0.33).
  // No DISTINCT needed — the Artist join is one-to-one (Artwork.artistId), never a row
  // multiplier — and Postgres rejects DISTINCT combined with an ORDER BY expression
  // that isn't itself in the select list.
  const fuzzy = await prisma.$queryRaw<{ id: string }[]>`
    SELECT a.id
    FROM "Artwork" a
    LEFT JOIN "Artist" ar ON ar.id = a."artistId"
    WHERE word_similarity(${q}, a.title) > 0.3 OR word_similarity(${q}, COALESCE(ar.name, '')) > 0.3
    ORDER BY GREATEST(word_similarity(${q}, a.title), word_similarity(${q}, COALESCE(ar.name, ''))) DESC
    LIMIT 40
  `;
  return new Set(fuzzy.map((r) => r.id));
}

async function matchingArtworkIdsForDateRange(
  prisma: PrismaClient,
  dateFrom: number | undefined,
  dateTo: number | undefined
): Promise<Set<string>> {
  const assertions = await prisma.assertion.findMany({
    where: {
      subjectType: "Artwork",
      field: "creationDate",
      isPreferred: true,
      ...(dateFrom ? { valueLatest: { gte: new Date(Date.UTC(dateFrom, 0, 1)) } } : {}),
      ...(dateTo ? { valueEarliest: { lte: new Date(Date.UTC(dateTo, 11, 31)) } } : {}),
    },
    select: { subjectId: true },
  });
  return new Set(assertions.map((a) => a.subjectId));
}

export async function getFilterOptions(prisma: PrismaClient) {
  const [institutions, mediums, movements] = await Promise.all([
    prisma.institution.findMany({ orderBy: { name: "asc" } }),
    prisma.physicalObject.findMany({
      where: { medium: { not: null } },
      select: { medium: true },
      distinct: ["medium"],
      orderBy: { medium: "asc" },
    }),
    // Only movements with at least one linked artwork — an empty MovementStyle row would
    // be a dead filter option.
    prisma.movementStyle.findMany({
      where: { artworks: { some: {} } },
      orderBy: { name: "asc" },
    }),
  ]);
  const cities = Array.from(new Set(institutions.map((i) => i.city).filter((c): c is string => !!c)));
  return { institutions, cities, mediums: mediums.map((m) => m.medium!).filter(Boolean), movements };
}
