import type { PrismaClient } from "@prisma/client";
import type { RelationshipType } from "@/lib/relationships/types";

export interface VerifiedRelationship {
  subjectSlug: string;
  objectSlug: string;
  type: RelationshipType;
  explanation: string;
  evidence: { sourceName: string; sourceUrl: string };
}

/**
 * Publish one hand-verified relationship. Idempotent — re-running with the same
 * (subject, object, type) updates rather than duplicates. This is a small, deliberately
 * manual publishing step (not part of bulk ingestion): each row here was individually
 * researched against a source that discusses these two specific objects, per ticket 09.
 */
export async function publishRelationship(prisma: PrismaClient, rel: VerifiedRelationship) {
  const subject = await prisma.artwork.findUniqueOrThrow({ where: { slug: rel.subjectSlug } });
  const object = await prisma.artwork.findUniqueOrThrow({ where: { slug: rel.objectSlug } });

  // Keyed by URL, not name: a relationship's evidence is a specific citation (one exact
  // page), unlike ingestion's Source rows which are one canonical API per named source.
  // Two relationships citing the same named catalogue but different pages must not
  // collapse onto one Source row — that would silently misattribute one row's evidence
  // link to the other's claim (caught live: see ticket 09's file for the real instance).
  const source =
    (await prisma.source.findFirst({ where: { url: rel.evidence.sourceUrl } })) ??
    (await prisma.source.create({ data: { name: rel.evidence.sourceName, url: rel.evidence.sourceUrl } }));

  return prisma.relationship.upsert({
    where: {
      subjectArtworkId_objectArtworkId_relationshipType: {
        subjectArtworkId: subject.id,
        objectArtworkId: object.id,
        relationshipType: rel.type,
      },
    },
    update: { explanation: rel.explanation, evidenceSourceId: source.id },
    create: {
      subjectArtworkId: subject.id,
      objectArtworkId: object.id,
      relationshipType: rel.type,
      explanation: rel.explanation,
      evidenceSourceId: source.id,
    },
  });
}
