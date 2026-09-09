import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getArtistBySlug } from "@/lib/queries/get-artist-by-slug";

// Minimal — see get-artist-by-slug.ts. Full artist page is ticket 08.
export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getArtistBySlug(prisma, slug);
  if (!data) notFound();

  const { artist, bio, institutions } = data;

  return (
    <main>
      <h1>{artist.name}</h1>
      {bio && <p>{bio}</p>}

      {institutions.length > 0 && (
        <p>
          Works held at:{" "}
          {institutions.map((i, idx) => (
            <span key={i.slug}>
              {idx > 0 && ", "}
              <Link href={`/museum/${i.slug}`}>{i.name}</Link>
            </span>
          ))}
        </p>
      )}

      <section aria-labelledby="works-heading">
        <h2 id="works-heading">Works in our catalogue ({artist.artworks.length})</h2>
        <ul>
          {artist.artworks.map((artwork) => {
            const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
            return (
              <li key={artwork.id}>
                <Link href={`/artwork/${artwork.slug}`}>
                  {image && <img src={image.sourceUrl} alt={image.altText ?? artwork.title} width={120} />}
                  {artwork.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
