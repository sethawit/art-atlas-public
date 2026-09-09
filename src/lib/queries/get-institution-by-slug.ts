import type { PrismaClient } from "@prisma/client";

/**
 * Minimal museum page data — pulled forward from ticket 10 as a small real slice, same
 * reasoning as get-artist-by-slug.ts. Visit links, hours, and freshness-labeled current
 * info are ticket 10's job; this only lists real catalogued holdings.
 */
export async function getInstitutionBySlug(prisma: PrismaClient, slug: string) {
  const institution = await prisma.institution.findUnique({
    where: { slug },
    include: {
      physicalObjects: {
        include: { artwork: { include: { artist: true } }, images: { where: { removedAt: null } } },
        orderBy: { artwork: { title: "asc" } },
      },
    },
  });
  if (!institution) return null;
  return institution;
}
