import type { PrismaClient } from "@prisma/client";

/** Artworks with more than one Assertion for the same field — a competing value exists and needs an admin to pick one. */
export async function listArtworksNeedingAssertionReview(prisma: PrismaClient) {
  const grouped = await prisma.assertion.groupBy({
    by: ["subjectId", "field"],
    where: { subjectType: "Artwork" },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });
  const artworkIds = Array.from(new Set(grouped.map((g) => g.subjectId)));
  if (artworkIds.length === 0) return [];

  return prisma.artwork.findMany({
    where: { id: { in: artworkIds } },
    select: { id: true, slug: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function listPendingDuplicateFlags(prisma: PrismaClient) {
  return prisma.duplicateFlag.findMany({
    where: { status: "pending" },
    include: {
      artworkA: { include: { physicalObjects: { include: { institution: true } } } },
      artworkB: { include: { physicalObjects: { include: { institution: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAdminDashboardCounts(prisma: PrismaClient) {
  const [totalArtworks, pendingDuplicateFlags, recentFailures, needingReview] = await Promise.all([
    prisma.artwork.count(),
    prisma.duplicateFlag.count({ where: { status: "pending" } }),
    prisma.ingestLog.findMany({
      where: { status: "failure" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    listArtworksNeedingAssertionReview(prisma),
  ]);
  return { totalArtworks, pendingDuplicateFlags, recentFailures, artworksNeedingReview: needingReview };
}

/** Every assertion for one artwork, grouped by field — for the per-artwork review page. */
export async function getArtworkAssertionsForReview(prisma: PrismaClient, artworkId: string) {
  const assertions = await prisma.assertion.findMany({
    where: { subjectType: "Artwork", subjectId: artworkId },
    include: { source: true },
    orderBy: [{ field: "asc" }, { retrievedAt: "desc" }],
  });
  const byField = new Map<string, typeof assertions>();
  for (const a of assertions) {
    const list = byField.get(a.field) ?? [];
    list.push(a);
    byField.set(a.field, list);
  }
  return byField;
}
