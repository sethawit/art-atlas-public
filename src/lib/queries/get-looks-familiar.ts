import type { PrismaClient } from "@prisma/client";
import { resolveImageUrl } from "@/lib/images/proxied-image-url";

export interface FamiliarEntry {
  slug: string;
  title: string;
  artistName: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  explanation: string;
}

export interface LooksFamiliarResult {
  subject: FamiliarEntry[];
  technique: FamiliarEntry[];
  movement: FamiliarEntry[];
  documentedInfluence: FamiliarEntry[];
}

const CAP = 6;

/**
 * §5 "Why does this look familiar?" — explicitly a DIFFERENT, separately-labeled category
 * from Family Explorer's verified relationships (§4: "Keep subject similarity and visual
 * similarity in separate categories"). Every entry here is a real, explainable pattern
 * match over data already in the catalogue — not a guess, but also not a claim of
 * historical connection the way a Relationship row is ("A machine-detected resemblance is
 * not proof of historical influence" — §5). "Visual similarity" (image-embedding/color
 * similarity) is deliberately not attempted: that's real ML infrastructure the master
 * prompt itself gates to Phase 3 ("image similarity" — §3), not a query over existing data
 * the way the other four categories are.
 */
export async function getLooksFamiliar(prisma: PrismaClient, artworkId: string): Promise<LooksFamiliarResult> {
  const artwork = await prisma.artwork.findUniqueOrThrow({
    where: { id: artworkId },
    include: { physicalObjects: true, movements: { include: { movement: true } } },
  });

  const [subjectTagsAssertion, mediums, movementIds] = await Promise.all([
    prisma.assertion.findFirst({
      where: { subjectType: "Artwork", subjectId: artworkId, field: "subjectTags", isPreferred: true },
    }),
    Promise.resolve(artwork.physicalObjects.map((po) => po.medium).filter((m): m is string => !!m)),
    Promise.resolve(artwork.movements.map((am) => am.movement.id)),
  ]);

  const [subject, technique, movement, documentedInfluence] = await Promise.all([
    findBySubject(prisma, artworkId, subjectTagsAssertion?.value),
    findByTechnique(prisma, artworkId, mediums),
    findByMovement(prisma, artworkId, movementIds, artwork.movements.map((am) => am.movement.name)),
    findByDocumentedInfluence(prisma, artworkId),
  ]);

  return { subject, technique, movement, documentedInfluence };
}

async function toEntries(
  prisma: PrismaClient,
  artworkIds: string[],
  explanation: (title: string) => string
): Promise<FamiliarEntry[]> {
  if (artworkIds.length === 0) return [];
  const artworks = await prisma.artwork.findMany({
    where: { id: { in: artworkIds } },
    include: { artist: true, physicalObjects: { include: { images: { where: { removedAt: null }, take: 1 } } } },
    take: CAP,
  });
  return artworks.map((a) => {
    const image = a.physicalObjects.flatMap((po) => po.images)[0];
    return {
      slug: a.slug,
      title: a.title,
      artistName: a.artist?.name ?? null,
      imageUrl: resolveImageUrl(image) ?? null,
      imageAlt: image?.altText ?? null,
      explanation: explanation(a.title),
    };
  });
}

async function findBySubject(prisma: PrismaClient, artworkId: string, tagsValue: string | undefined): Promise<FamiliarEntry[]> {
  if (!tagsValue) return [];
  const terms = tagsValue.split(",").map((t) => t.trim()).filter(Boolean);
  if (terms.length === 0) return [];

  const matches = await prisma.assertion.findMany({
    where: {
      subjectType: "Artwork",
      field: "subjectTags",
      isPreferred: true,
      subjectId: { not: artworkId },
      OR: terms.map((term) => ({ value: { contains: term, mode: "insensitive" as const } })),
    },
    select: { subjectId: true, value: true },
  });

  // Each match can share a different term with the source artwork — track which, per
  // artwork, so the explanation names the actual shared tag rather than a generic one.
  const sharedTermByArtworkId = new Map<string, string>();
  for (const m of matches) {
    if (sharedTermByArtworkId.has(m.subjectId)) continue;
    const shared = terms.find((t) => m.value.toLowerCase().includes(t.toLowerCase()));
    if (shared) sharedTermByArtworkId.set(m.subjectId, shared);
  }

  const ids = Array.from(sharedTermByArtworkId.keys()).slice(0, CAP);
  if (ids.length === 0) return [];

  const artworks = await prisma.artwork.findMany({
    where: { id: { in: ids } },
    include: { artist: true, physicalObjects: { include: { images: { where: { removedAt: null }, take: 1 } } } },
  });

  return artworks.map((a) => {
    const image = a.physicalObjects.flatMap((po) => po.images)[0];
    const sharedTerm = sharedTermByArtworkId.get(a.id)!;
    return {
      slug: a.slug,
      title: a.title,
      artistName: a.artist?.name ?? null,
      imageUrl: resolveImageUrl(image) ?? null,
      imageAlt: image?.altText ?? null,
      explanation: `Shares the subject tag "${sharedTerm}" — a pattern match, not a documented connection.`,
    };
  });
}

async function findByTechnique(prisma: PrismaClient, artworkId: string, mediums: string[]) {
  if (mediums.length === 0) return [];
  const medium = mediums[0];
  const matches = await prisma.physicalObject.findMany({
    where: { medium, artworkId: { not: artworkId } },
    select: { artworkId: true },
    take: CAP * 2,
  });
  const ids = Array.from(new Set(matches.map((m) => m.artworkId)));
  return toEntries(prisma, ids, () => `Same medium: ${medium}.`);
}

async function findByMovement(prisma: PrismaClient, artworkId: string, movementIds: string[], movementNames: string[]) {
  if (movementIds.length === 0) return [];
  const matches = await prisma.artworkMovement.findMany({
    where: { movementId: { in: movementIds }, artworkId: { not: artworkId } },
    select: { artworkId: true },
    take: CAP * 2,
  });
  const ids = Array.from(new Set(matches.map((m) => m.artworkId)));
  return toEntries(prisma, ids, () => `Associated with ${movementNames.join(", ")}, like this work.`);
}

async function findByDocumentedInfluence(prisma: PrismaClient, artworkId: string) {
  const relationships = await prisma.relationship.findMany({
    where: {
      relationshipType: "documented_influence",
      OR: [{ subjectArtworkId: artworkId }, { objectArtworkId: artworkId }],
      reviewStatus: { not: "flagged" },
    },
    include: { subjectArtwork: true, objectArtwork: true },
  });
  const others = relationships.map((r) => (r.subjectArtworkId === artworkId ? r.objectArtwork : r.subjectArtwork));
  return toEntries(
    prisma,
    others.map((a) => a.id),
    () => "A documented influence or response — verified, see Related pieces for the full citation."
  );
}
