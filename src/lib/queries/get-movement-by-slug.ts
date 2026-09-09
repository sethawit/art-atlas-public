import type { PrismaClient } from "@prisma/client";

// Short, defensible general-knowledge definitions for the movements/periods currently in
// our catalogue (ticket 08: explain the term, geography, characteristics — no implied
// universal sequence). This is encyclopedic context, not a claim about a specific object,
// so it doesn't carry a per-fact citation the way an object-level Assertion does — same
// distinction a museum's own "About this movement" wall text makes. Add an entry here
// only for a movement genuinely represented in the catalogue; an unlisted one falls back
// to a plain, honest "no summary yet" rather than a guess.
const MOVEMENT_CONTEXT: Record<string, { geography: string; characteristics: string; context: string }> = {
  impressionism: {
    geography: "Originated in France, centered on Paris, from the 1860s–1880s.",
    characteristics:
      "Visible brushwork, an emphasis on capturing changing light and everyday scenes, and painting outdoors (en plein air) rather than composing entirely in the studio.",
    context:
      "Named (initially dismissively) after Monet's 1872 painting Impression, Sunrise. A specifically French movement of its period — not a universal stage every tradition passed through.",
  },
  "post-impressionism": {
    geography: "Also centered in France, roughly the 1880s–1900s.",
    characteristics:
      "A loose grouping of artists (including Van Gogh, Cézanne, and others) who kept Impressionism's bright color but pushed toward more structure, symbolism, or expressive distortion than Impressionism's momentary-perception approach.",
    context: "A direct successor to Impressionism in France, not a single unified style — its artists differed widely from one another.",
  },
  realism: {
    geography: "Mid-19th-century France, with related movements elsewhere in Europe.",
    characteristics: "Depicting everyday subjects and working-class life with unidealized accuracy, rejecting Romanticism's dramatization.",
    context: "Predates Impressionism in France and is often discussed as a precursor to it, though the two are distinct movements.",
  },
};

export async function getMovementBySlug(prisma: PrismaClient, slug: string) {
  const movement = await prisma.movementStyle.findUnique({
    where: { slug },
    include: {
      artworks: {
        include: {
          artwork: {
            include: {
              artist: true,
              physicalObjects: { include: { institution: true, images: { where: { removedAt: null }, take: 1 } } },
            },
          },
        },
      },
    },
  });
  if (!movement) return null;

  const artists = new Map<string, { slug: string; name: string }>();
  for (const am of movement.artworks) {
    if (am.artwork.artist) artists.set(am.artwork.artist.slug, am.artwork.artist);
  }

  return {
    movement,
    context: MOVEMENT_CONTEXT[movement.slug] ?? null,
    artworks: movement.artworks.map((am) => am.artwork),
    artists: Array.from(artists.values()),
  };
}
