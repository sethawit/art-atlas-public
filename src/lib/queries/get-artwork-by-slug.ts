import type { PrismaClient } from "@prisma/client";

/**
 * Load everything the artwork detail page's Overview/Understand/Sources tabs need.
 * Assertions are append-only (a re-ingest adds a fresh row rather than overwriting), so
 * for a given field we take the most recently retrieved one — later tickets (admin
 * review, §9) will let an editor pick a different preferred value explicitly.
 */
export async function getArtworkBySlug(prisma: PrismaClient, slug: string) {
  const artwork = await prisma.artwork.findUnique({
    where: { slug },
    include: {
      artist: true,
      physicalObjects: { include: { institution: true, images: true } },
    },
  });
  if (!artwork) return null;

  const assertions = await prisma.assertion.findMany({
    where: { subjectType: "Artwork", subjectId: artwork.id },
    include: { source: true },
    orderBy: { retrievedAt: "desc" },
  });

  const latestByField = new Map<string, (typeof assertions)[number]>();
  for (const assertion of assertions) {
    if (!latestByField.has(assertion.field)) latestByField.set(assertion.field, assertion);
  }

  return {
    artwork,
    physicalObject: artwork.physicalObjects[0] ?? null,
    fields: latestByField,
    allAssertions: assertions,
  };
}

export type ArtworkPageData = NonNullable<Awaited<ReturnType<typeof getArtworkBySlug>>>;
