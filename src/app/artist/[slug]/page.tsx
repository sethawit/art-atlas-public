import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getArtistBySlug } from "@/lib/queries/get-artist-by-slug";
import { proxiedImageUrl } from "@/lib/images/proxied-image-url";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArtistBySlug(prisma, slug);
  if (!data) return {};

  const { artist, bio } = data;
  const description = [bio?.nationality, bio?.lifespanYears].filter(Boolean).join(", ") || undefined;
  return { title: artist.name, description };
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getArtistBySlug(prisma, slug);
  if (!data) notFound();

  const { artist, bio, institutions, styles } = data;

  return (
    <main>
      <h1>{artist.name}</h1>

      <dl>
        <dt>Nationality</dt>
        <dd>{bio?.nationality ?? "Unknown"}</dd>
        <dt>Lifespan</dt>
        <dd>{bio?.lifespanYears ?? "Unknown"}</dd>
        <dt>Places</dt>
        <dd>Not separately extracted — see biography below, when available.</dd>
      </dl>

      {bio?.raw && <p>{bio.raw}</p>}
      {!bio && <p>No sourced biography captured for this artist yet.</p>}

      {styles.length > 0 && (
        <p>
          Associated styles:{" "}
          {styles.map((s, i) => (
            <span key={s.slug}>
              {i > 0 && ", "}
              <Link href={`/movement/${s.slug}`}>{s.name}</Link>
            </span>
          ))}
        </p>
      )}

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

      <p>Related artists — coming soon (no verified artist-to-artist relationships published yet).</p>

      <section aria-labelledby="works-heading">
        <h2 id="works-heading">Works in our catalogue ({artist.artworks.length})</h2>
        <ul className="card-grid">
          {artist.artworks.map((artwork) => {
            const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
            const artworkStyles = artwork.movements.map((am) => am.movement.name);
            return (
              <li key={artwork.id}>
                <Link href={`/artwork/${artwork.slug}`}>
                  {image && <img src={proxiedImageUrl(image.sourceUrl)} alt={image.altText ?? artwork.title} width={120} loading="lazy" />}
                  {artwork.title}
                </Link>
                {/* Per-work style, not one blanket label for the whole artist — ticket 08. */}
                {artworkStyles.length > 0 && <span> — {artworkStyles.join(", ")}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
