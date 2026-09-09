import type { PrismaClient } from "@prisma/client";

/**
 * Shared per-run cleanup for the shared, non-transactional test database. Deletes every
 * row this run created, identified by runId-suffixed slug/name, in FK-safe order.
 *
 * Added after a real bug (found live, not hypothesized): several test files only called
 * `prisma.$disconnect()` in `afterAll`, never deleting their own fixture rows. Across many
 * `vitest run` invocations in one session, that left ~900 leftover artworks in the shared
 * test DB — enough that `search-artworks.test.ts`'s "filters by medium" test started
 * failing for real: 25 real+leftover "Watercolor" rows before "Sunset" alphabetically
 * pushed its own fixture off `searchArtworks`'s first page (PAGE_SIZE 24). This is the
 * same class of bug as the `findBySubject`/`findByTechnique` fixes in ticket 14 (a capped
 * or paginated query, crowded out by data the test didn't expect to compete with) — just
 * caused by missing cleanup instead of a colliding real-world term. Every test file that
 * creates runId-suffixed fixtures should call this from its own `afterAll`.
 */
export async function cleanupByRunId(prisma: PrismaClient, runId: string) {
  const artworks = await prisma.artwork.findMany({ where: { slug: { endsWith: runId } } });
  const artworkIds = artworks.map((a) => a.id);

  await prisma.duplicateFlag.deleteMany({
    where: { OR: [{ artworkAId: { in: artworkIds } }, { artworkBId: { in: artworkIds } }] },
  });
  await prisma.relationship.deleteMany({
    where: { OR: [{ subjectArtworkId: { in: artworkIds } }, { objectArtworkId: { in: artworkIds } }] },
  });
  await prisma.assertion.deleteMany({ where: { subjectId: { in: artworkIds } } });
  await prisma.imageAsset.deleteMany({ where: { physicalObject: { artworkId: { in: artworkIds } } } });
  await prisma.physicalObject.deleteMany({ where: { artworkId: { in: artworkIds } } });
  await prisma.artworkMovement.deleteMany({ where: { artworkId: { in: artworkIds } } });
  await prisma.artwork.deleteMany({ where: { id: { in: artworkIds } } });

  await prisma.movementStyle.deleteMany({ where: { slug: { endsWith: runId } } });
  await prisma.institution.deleteMany({ where: { slug: { endsWith: runId } } });
  await prisma.artist.deleteMany({ where: { slug: { endsWith: runId } } });
  await prisma.source.deleteMany({ where: { name: { endsWith: runId } } });
}
