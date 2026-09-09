import type { PrismaClient } from "@prisma/client";

export interface ComparisonEntry {
  slug: string;
  title: string;
  artistName: string | null;
  artistSlug: string | null;
  dateDisplay: string | null;
  medium: string | null;
  dimensions: string | null;
  institutionName: string | null;
  institutionSlug: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
}

/**
 * §5 "Compare and understand" — any 2-4 works, not just ones already linked by a
 * verified Relationship (that narrower case is the artwork page's own comparison view,
 * ticket 09). Slugs that don't resolve to a real artwork are silently skipped rather than
 * erroring the whole comparison — a stale or mistyped slug in the URL shouldn't break the
 * other 1-3 real works still being compared.
 */
export async function getArtworksForComparison(prisma: PrismaClient, slugs: string[]): Promise<ComparisonEntry[]> {
  const uniqueSlugs = Array.from(new Set(slugs)).slice(0, 4);
  if (uniqueSlugs.length === 0) return [];

  const artworks = await prisma.artwork.findMany({
    where: { slug: { in: uniqueSlugs } },
    include: {
      artist: true,
      physicalObjects: { include: { institution: true, images: { where: { removedAt: null }, take: 1 } } },
    },
  });
  const bySlug = new Map(artworks.map((a) => [a.slug, a]));

  const dateAssertions = await prisma.assertion.findMany({
    where: {
      subjectType: "Artwork",
      field: "creationDate",
      isPreferred: true,
      subjectId: { in: artworks.map((a) => a.id) },
    },
    select: { subjectId: true, value: true },
  });
  const dateBySubject = new Map(dateAssertions.map((a) => [a.subjectId, a.value]));

  // Preserve the caller's slug order (the order works were selected in), not DB order.
  return uniqueSlugs
    .map((slug) => bySlug.get(slug))
    .filter((a): a is NonNullable<typeof a> => a !== undefined)
    .map((artwork) => {
      const physicalObject = artwork.physicalObjects[0] ?? null;
      const image = physicalObject?.images[0] ?? null;
      return {
        slug: artwork.slug,
        title: artwork.title,
        artistName: artwork.artist?.name ?? null,
        artistSlug: artwork.artist?.slug ?? null,
        dateDisplay: dateBySubject.get(artwork.id) ?? null,
        medium: physicalObject?.medium ?? null,
        dimensions: physicalObject?.dimensions ?? null,
        institutionName: physicalObject?.institution?.name ?? null,
        institutionSlug: physicalObject?.institution?.slug ?? null,
        imageUrl: image?.sourceUrl ?? null,
        imageAlt: image?.altText ?? null,
      };
    });
}
