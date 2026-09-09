import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Homepage — ticket 06. Discovery cards cover artists and museums (real data); style
// cards are omitted rather than faked — MovementStyle rows don't exist yet (ticket 08
// normalizes the styleTitle/subjectTags text Assertions already ingested into real
// entities). The featured related-piece story is likewise omitted rather than faked: a
// single verified relationship needs real per-object research (ticket 09's job), not a
// guess from matching titles — see the "Coming soon" note below instead of a dead link
// or an unverified claim.

async function getHeroArtwork() {
  return prisma.artwork.findUnique({
    where: { slug: "wheat-field-with-cypresses" },
    include: {
      artist: true,
      physicalObjects: { include: { images: { where: { removedAt: null }, take: 1 } } },
    },
  });
}

async function getFeaturedArtists() {
  const artists = await prisma.artist.findMany({
    include: { _count: { select: { artworks: true } } },
    orderBy: { artworks: { _count: "desc" } },
    take: 6,
  });
  return artists.filter((a) => a._count.artworks > 0);
}

async function getMuseums() {
  return prisma.institution.findMany({ include: { _count: { select: { physicalObjects: true } } } });
}

export default async function HomePage() {
  const [hero, artists, museums, totalArtworks] = await Promise.all([
    getHeroArtwork(),
    getFeaturedArtists(),
    getMuseums(),
    prisma.artwork.count(),
  ]);
  const heroImage = hero?.physicalObjects.flatMap((po) => po.images)[0];

  return (
    <main>
      <header>
        <p>Art Atlas</p>
        <h1>Discover an artwork. Understand its connections. Find where to see it.</h1>
        <p>
          Every artwork has a story, a family, and a journey. {totalArtworks} verified
          artworks in our catalogue so far, sourced from the Met and the Art Institute of
          Chicago.
        </p>
      </header>

      <form action="/explore">
        <label htmlFor="q">Search by artwork or artist</label>
        <input id="q" name="q" type="search" placeholder="e.g. Van Gogh, Water Lilies" />
        <button type="submit">Search</button>
      </form>

      {hero && (
        <section aria-labelledby="featured-heading">
          <h2 id="featured-heading">Featured artwork</h2>
          <Link href={`/artwork/${hero.slug}`}>
            {heroImage && <img src={heroImage.sourceUrl} alt={heroImage.altText ?? hero.title} width={480} />}
            <p>{hero.title}</p>
          </Link>
          {hero.artist && <p>{hero.artist.name}</p>}
          {heroImage?.credit && <p>{heroImage.credit}</p>}
        </section>
      )}

      <section aria-labelledby="related-heading">
        <h2 id="related-heading">Related pieces</h2>
        <p>
          Coming soon — each related-piece story on Art Atlas is individually researched
          and verified before publishing (never inferred from a matching title alone).
          None have cleared that bar yet.
        </p>
      </section>

      <section aria-labelledby="artists-heading">
        <h2 id="artists-heading">Explore by artist</h2>
        <ul>
          {artists.map((artist) => (
            <li key={artist.id}>
              <Link href={`/artist/${artist.slug}`}>
                {artist.name} ({artist._count.artworks})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="museums-heading">
        <h2 id="museums-heading">Explore by museum</h2>
        <ul>
          {museums.map((museum) => (
            <li key={museum.id}>
              <Link href={`/museum/${museum.slug}`}>
                {museum.name} ({museum._count.physicalObjects})
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="styles-heading">
        <h2 id="styles-heading">Explore by style</h2>
        <p>Coming soon — style and movement pages are still being built.</p>
      </section>
    </main>
  );
}
