import type { PrismaClient } from "@prisma/client";
import { relationshipLabel, type RelationshipType } from "@/lib/relationships/types";

/**
 * Every verified relationship touching one artwork, from that artwork's point of view.
 * Direction-aware: relationshipLabel reads differently depending on whether this artwork
 * is the relationship's subject or object (ticket 09).
 */
export async function getRelatedPieces(prisma: PrismaClient, artworkId: string) {
  const relationships = await prisma.relationship.findMany({
    where: { OR: [{ subjectArtworkId: artworkId }, { objectArtworkId: artworkId }] },
    include: {
      subjectArtwork: {
        include: {
          artist: true,
          physicalObjects: { include: { institution: true, images: { where: { removedAt: null }, take: 1 } } },
        },
      },
      objectArtwork: {
        include: {
          artist: true,
          physicalObjects: { include: { institution: true, images: { where: { removedAt: null }, take: 1 } } },
        },
      },
      evidenceSource: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const withDates = await Promise.all(
    relationships.map(async (rel) => {
      const viewpoint: "subject" | "object" = rel.subjectArtworkId === artworkId ? "subject" : "object";
      const other = viewpoint === "subject" ? rel.objectArtwork : rel.subjectArtwork;
      const dateAssertion = await prisma.assertion.findFirst({
        where: { subjectType: "Artwork", subjectId: other.id, field: "creationDate", isPreferred: true },
      });
      return {
        relationship: rel,
        label: relationshipLabel(rel.relationshipType as RelationshipType, viewpoint),
        explanation: rel.explanation,
        evidenceSource: rel.evidenceSource,
        artwork: other,
        date: dateAssertion?.value ?? null,
      };
    })
  );

  return withDates;
}
