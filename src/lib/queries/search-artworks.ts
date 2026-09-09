import type { PrismaClient } from "@prisma/client";

/**
 * Search by artwork title or artist name. Minimal — no filters, aliases, or spelling
 * tolerance yet; this exists so the homepage's search bar (ticket 06) has a real,
 * functional destination. Ticket 07 builds the full Explore page (date/movement/medium/
 * museum/city/display-status filters, URL-preserved, no-result suggestions) at this same
 * route.
 */
export async function searchArtworks(prisma: PrismaClient, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.artwork.findMany({
    where: {
      OR: [
        { title: { contains: trimmed, mode: "insensitive" } },
        { artist: { name: { contains: trimmed, mode: "insensitive" } } },
      ],
    },
    include: {
      artist: true,
      physicalObjects: { include: { images: { where: { removedAt: null }, take: 1 } } },
    },
    orderBy: { title: "asc" },
    take: 40,
  });
}
