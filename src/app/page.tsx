import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Homepage — ticket 06, updated in ticket 14 to stop showing "coming soon" for features
// tickets 08/09 already shipped: real MovementStyle rows and 22 verified relationships
// exist now, so the style cards and featured story below are real data, not placeholders.

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

async function getFeaturedStory() {
  // The single documented_influence pair rather than an edge from the 7-work Monet
  // clique — one self-contained story reads better here than one slice of a larger one.
  return prisma.relationship.findFirst({
    where: { relationshipType: "documented_influence" },
    include: {
      subjectArtwork: {
        include: { artist: true, physicalObjects: { include: { images: { where: { removedAt: null }, take: 1 } } } },
      },
      objectArtwork: { include: { artist: true } },
      evidenceSource: true,
    },
  });
}

async function getStyles() {
  const styles = await prisma.movementStyle.findMany({ include: { _count: { select: { artworks: true } } } });
  return styles.filter((s) => s._count.artworks > 0);
}

export default async function HomePage() {
  const [hero, artists, museums, totalArtworks, featuredStory, styles] = await Promise.all([
    getHeroArtwork(),
    getFeaturedArtists(),
    getMuseums(),
    prisma.artwork.count(),
    getFeaturedStory(),
    getStyles(),
  ]);
  const heroImage = hero?.physicalObjects.flatMap((po) => po.images)[0];
  const storyImage = featuredStory?.subjectArtwork.physicalObjects.flatMap((po) => po.images)[0];

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
        <h2 id="related-heading">A related-piece story</h2>
        {featuredStory ? (
          <>
            <Link href={`/artwork/${featuredStory.subjectArtwork.slug}`}>
              {storyImage && (
                <img
                  src={storyImage.sourceUrl}
                  alt={storyImage.altText ?? featuredStory.subjectArtwork.title}
                  width={320}
                />
              )}
              <p>{featuredStory.subjectArtwork.title}</p>
            </Link>
            {featuredStory.subjectArtwork.artist && <p>{featuredStory.subjectArtwork.artist.name}</p>}
            <p>{featuredStory.explanation}</p>
            <p>
              Related to{" "}
              <Link href={`/artwork/${featuredStory.objectArtwork.slug}`}>{featuredStory.objectArtwork.title}</Link>
              {" — "}
              <a href={featuredStory.evidenceSource.url} target="_blank" rel="noopener noreferrer">
                {featuredStory.evidenceSource.name}
              </a>
            </p>
          </>
        ) : (
          <p>
            Coming soon — each related-piece story on Art Atlas is individually researched
            and verified before publishing (never inferred from a matching title alone).
            None have cleared that bar yet.
          </p>
        )}
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
        {styles.length === 0 ? (
          <p>Coming soon — style and movement pages are still being built.</p>
        ) : (
          <ul>
            {styles.map((style) => (
              <li key={style.id}>
                <Link href={`/movement/${style.slug}`}>
                  {style.name} ({style._count.artworks})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
