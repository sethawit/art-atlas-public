import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { proxiedImageUrl } from "@/lib/images/proxied-image-url";
import { ArtFrame } from "@/components/ArtImage";

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
      <section className="hero">
        <div>
          <h1>Discover an artwork. Understand its connections. Find where to see it.</h1>
          <p className="lede">
            Every artwork has a story, a family, and a journey.{" "}
            <span className="hero__count">{totalArtworks} verified artworks</span> in our
            catalogue so far, sourced from the Met, the Art Institute of Chicago, and the
            Cleveland Museum of Art.
          </p>
          <form action="/explore" className="hero__search">
            <label htmlFor="q">Search by artwork, artist, or subject</label>
            <input id="q" name="q" type="search" placeholder="e.g. Van Gogh, Water Lilies" />
            <button type="submit">Search</button>
          </form>
        </div>
        {hero && (
          <Link href={`/artwork/${hero.slug}`} className="hero__plate" aria-labelledby="featured-heading">
            <figure className="plate">
              <ArtFrame
                src={proxiedImageUrl(heroImage?.sourceUrl)}
                alt={heroImage?.altText ?? hero.title}
                sizes="(min-width: 1024px) 55vw, 100vw"
                preload
                hiRes
              />
              <figcaption>
                <strong id="featured-heading">{hero.title}</strong>
                {hero.artist && <span>{hero.artist.name}</span>}
              </figcaption>
            </figure>
          </Link>
        )}
      </section>

      <section aria-labelledby="related-heading" className="story">
        {featuredStory ? (
          <>
            <Link href={`/artwork/${featuredStory.subjectArtwork.slug}`} className="story__frame" tabIndex={-1} aria-hidden="true">
              <ArtFrame
                src={proxiedImageUrl(storyImage?.sourceUrl)}
                alt=""
                sizes="(min-width: 1024px) 35vw, 100vw"
              />
            </Link>
            <div>
              <p className="label">A related-piece story</p>
              <h2 id="related-heading" className="story__title">
                <Link href={`/artwork/${featuredStory.subjectArtwork.slug}`}>
                  {featuredStory.subjectArtwork.title}
                </Link>
                {featuredStory.subjectArtwork.artist && (
                  <span className="muted">, {featuredStory.subjectArtwork.artist.name}</span>
                )}
              </h2>
              <p>{featuredStory.explanation}</p>
              <p className="muted">
                Related to{" "}
                <Link href={`/artwork/${featuredStory.objectArtwork.slug}`}>{featuredStory.objectArtwork.title}</Link>
                <span className="sep" />
                <a href={featuredStory.evidenceSource.url} target="_blank" rel="noopener noreferrer">
                  {featuredStory.evidenceSource.name}
                </a>
              </p>
            </div>
          </>
        ) : (
          <div>
            <h2 id="related-heading">A related-piece story</h2>
            <p>
              Coming soon. Each related-piece story on Art Atlas is individually researched
              and verified before publishing (never inferred from a matching title alone).
              None have cleared that bar yet.
            </p>
          </div>
        )}
      </section>

      <div className="index-block">
        <section aria-labelledby="artists-heading" className="index-row">
          <h2 id="artists-heading">Explore by artist</h2>
          <ul className="tag-list">
            {artists.map((artist) => (
              <li key={artist.id}>
                <Link href={`/artist/${artist.slug}`}>
                  {artist.name} <span className="count">{artist._count.artworks}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="museums-heading" className="index-row">
          <h2 id="museums-heading">Explore by museum</h2>
          <ul className="tag-list">
            {museums.map((museum) => (
              <li key={museum.id}>
                <Link href={`/museum/${museum.slug}`}>
                  {museum.name} <span className="count">{museum._count.physicalObjects}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="styles-heading" className="index-row">
          <h2 id="styles-heading">Explore by style</h2>
          {styles.length === 0 ? (
            <p>Coming soon. Style and movement pages are still being built.</p>
          ) : (
            <ul className="tag-list">
              {styles.map((style) => (
                <li key={style.id}>
                  <Link href={`/movement/${style.slug}`}>
                    {style.name} <span className="count">{style._count.artworks}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
