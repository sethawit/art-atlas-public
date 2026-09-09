import type { PrismaClient } from "@prisma/client";
import { parseArtistBio } from "@/lib/artists/parse-bio";

/**
 * Artist page data (ticket 08). Bio stays an artwork-level Assertion (the source APIs
 * return biography alongside each object, not as a standalone artist record — a ticket
 * 03/04 modeling choice this reuses rather than re-litigates); this pulls the first one
 * found and parses it conservatively (parse-bio.ts) rather than guessing at structured
 * fields the source text doesn't reliably support.
 *
 * "Places worked" and "related artists" are honestly absent, not faked: no source we
 * ingest gives structured place-of-work data, and no verified artist-to-artist
 * relationship exists yet (that would need the same evidentiary bar as ticket 09's
 * artwork relationships, applied to artists — not attempted here).
 */
export async function getArtistBySlug(prisma: PrismaClient, slug: string) {
  const artist = await prisma.artist.findUnique({
    where: { slug },
    include: {
      artworks: {
        include: {
          physicalObjects: { include: { institution: true, images: { where: { removedAt: null } } } },
          movements: { include: { movement: true } },
        },
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

  // Every movement/style linked to at least one of this artist's works — shown per
  // work, never collapsed into one blanket label (ticket 08 acceptance).
  const styles = new Map<string, { slug: string; name: string }>();
  for (const artwork of artist.artworks) {
    for (const am of artwork.movements) styles.set(am.movement.slug, am.movement);
  }

  return {
    artist,
    bio: bioAssertion ? parseArtistBio(bioAssertion.value) : null,
    institutions: Array.from(institutions.values()),
    styles: Array.from(styles.values()),
  };
}
