import type { PrismaClient } from "@prisma/client";

/**
 * Minimal artist page data — pulled forward from ticket 08 as a small real slice so
 * ticket 06's homepage discovery cards have a genuine destination instead of a
 * placeholder. Full artist page (sourced bio as its own entity-level assertion, lifespan,
 * places worked, related artists) is ticket 08's job; this reuses what ingestion already
 * captured (an artistBio Assertion recorded per-artwork, since the source APIs return
 * biography alongside each object rather than as a standalone artist record).
 */
export async function getArtistBySlug(prisma: PrismaClient, slug: string) {
  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      artworks: {
        include: { physicalObjects: { include: { institution: true, images: { where: { removedAt: null } } } } },
        orderBy: { title: "asc" },
      },
    },
  });
  if (!artist) return null;

  const bioAssertion = await prisma.assertion.findFirst({
    where: {
      subjectType: "Artwork",
      field: "artistBio",
      subjectId: { in: artist.artworks.map((a) => a.id) },
    },
  });

  const institutions = new Map<string, { slug: string; name: string }>();
  for (const artwork of artist.artworks) {
    for (const po of artwork.physicalObjects) {
      if (po.institution) institutions.set(po.institution.slug, po.institution);
    }
  }

  return { artist, bio: bioAssertion?.value ?? null, institutions: Array.from(institutions.values()) };
}
