import type { PrismaClient } from "@prisma/client";
import { relationshipLabel, type RelationshipType } from "@/lib/relationships/types";
import { resolveImageUrl } from "@/lib/images/proxied-image-url";

export interface ComparisonEntry {
  artworkId: string;
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

export interface PairInsight {
  slugA: string;
  slugB: string;
  relationshipLabel: string | null;
  differences: string[];
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
        artworkId: artwork.id,
        slug: artwork.slug,
        title: artwork.title,
        artistName: artwork.artist?.name ?? null,
        artistSlug: artwork.artist?.slug ?? null,
        dateDisplay: dateBySubject.get(artwork.id) ?? null,
        medium: physicalObject?.medium ?? null,
        dimensions: physicalObject?.dimensions ?? null,
        institutionName: physicalObject?.institution?.name ?? null,
        institutionSlug: physicalObject?.institution?.slug ?? null,
        imageUrl: resolveImageUrl(image) ?? null,
        imageAlt: image?.altText ?? null,
      };
    });
}

// A clean single 4-digit year, only when the whole date string is just that (no range,
// no "c."/"ca."/"?" qualifier) — anything less certain is skipped rather than guessed at.
function soleYear(dateDisplay: string): number | null {
  const match = dateDisplay.trim().match(/^(\d{4})$/);
  return match ? Number(match[1]) : null;
}

/**
 * §5 "Compare and understand" requires "related-piece labels" and "concise sourced
 * differences" alongside the images/dates/materials/dimensions/collections table
 * (ticket 22 shipped the table without these two; this closes that gap). Every
 * difference sentence is derived directly from fields already shown on the page — never
 * generated prose or an inferred judgment about which is "better" or "more important."
 */
export async function getPairwiseComparisonInsights(
  prisma: PrismaClient,
  entries: ComparisonEntry[]
): Promise<PairInsight[]> {
  const artworkIds = entries.map((e) => e.artworkId);
  const relationships = await prisma.relationship.findMany({
    where: {
      OR: [
        { subjectArtworkId: { in: artworkIds }, objectArtworkId: { in: artworkIds } },
        { objectArtworkId: { in: artworkIds }, subjectArtworkId: { in: artworkIds } },
      ],
      reviewStatus: { not: "flagged" },
    },
  });

  const insights: PairInsight[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      const rel = relationships.find(
        (r) =>
          (r.subjectArtworkId === a.artworkId && r.objectArtworkId === b.artworkId) ||
          (r.subjectArtworkId === b.artworkId && r.objectArtworkId === a.artworkId)
      );
      const viewpoint = rel?.subjectArtworkId === a.artworkId ? "subject" : "object";

      const differences: string[] = [];
      if (a.medium && b.medium && a.medium.trim().toLowerCase() !== b.medium.trim().toLowerCase()) {
        differences.push(`Medium differs: "${a.medium}" vs "${b.medium}".`);
      }
      if (a.dimensions && b.dimensions && a.dimensions.trim() !== b.dimensions.trim()) {
        differences.push(`Documented dimensions differ: "${a.dimensions}" vs "${b.dimensions}".`);
      }
      if (a.dateDisplay && b.dateDisplay && a.dateDisplay.trim() !== b.dateDisplay.trim()) {
        const yearA = soleYear(a.dateDisplay);
        const yearB = soleYear(b.dateDisplay);
        if (yearA !== null && yearB !== null) {
          const gap = Math.abs(yearA - yearB);
          differences.push(
            gap === 0
              ? `Same year (${a.dateDisplay}), different documented date text.`
              : `Dated ${gap} year${gap === 1 ? "" : "s"} apart: ${a.dateDisplay} vs ${b.dateDisplay}.`
          );
        } else {
          differences.push(`Dated differently: ${a.dateDisplay} vs ${b.dateDisplay}.`);
        }
      }
      if (
        a.institutionName &&
        b.institutionName &&
        a.institutionName.trim().toLowerCase() !== b.institutionName.trim().toLowerCase()
      ) {
        differences.push(`Held by different institutions: ${a.institutionName} vs ${b.institutionName}.`);
      }

      insights.push({
        slugA: a.slug,
        slugB: b.slug,
        relationshipLabel: rel ? relationshipLabel(rel.relationshipType as RelationshipType, viewpoint) : null,
        differences,
      });
    }
  }
  return insights;
}
