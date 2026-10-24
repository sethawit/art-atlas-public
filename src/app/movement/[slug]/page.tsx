import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMovementBySlug } from "@/lib/queries/get-movement-by-slug";
import { proxiedImageUrl } from "@/lib/images/proxied-image-url";
import { ArtFrame } from "@/components/ArtImage";

const KIND_EXPLANATION: Record<string, string> = {
  period: "A period marks a span of time, not a shared visual approach. Works from a period can look very different from one another.",
  movement: "A movement is a group of artists who shared a deliberate approach or philosophy, usually for a specific span of time and place.",
  technique: "A technique is a way of making a work (a material or method), independent of period or movement.",
  style: "A style is a recognizable visual approach that can recur across different periods, movements, or artists.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getMovementBySlug(prisma, slug);
  if (!data) return {};

  const { movement, context } = data;
  return {
    title: movement.name,
    description: context?.characteristics ?? `${movement.name} (${movement.kind}) on Art Atlas.`,
  };
}

export default async function MovementPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getMovementBySlug(prisma, slug);
  if (!data) notFound();

  const { movement, context, artworks, artists } = data;

  return (
    <main>
      <header className="page-head">
        <p className="label">{movement.kind}</p>
        <h1>{movement.name}</h1>
        <p className="lede">
          {KIND_EXPLANATION[movement.kind] ?? "Distinguished from period/movement/technique/style rather than conflated with them."}
        </p>
      </header>

      {context ? (
        <>
          <p>{context.geography}</p>
          <p>{context.characteristics}</p>
          <p>{context.context}</p>
        </>
      ) : (
        <p className="muted">No summary written yet for this {movement.kind}.</p>
      )}

      {artists.length > 0 && (
        <section aria-labelledby="artists-heading">
          <h2 id="artists-heading">Associated artists</h2>
          <ul className="tag-list">
            {artists.map((a) => (
              <li key={a.slug}>
                <Link href={`/artist/${a.slug}`}>{a.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="works-heading">
        <h2 id="works-heading">
          Representative works <span className="count">{artworks.length}</span>
        </h2>
        <ul className="card-grid">
          {artworks.map((artwork) => {
            const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
            return (
              <li key={artwork.id}>
                <Link href={`/artwork/${artwork.slug}`}>
                  <ArtFrame src={proxiedImageUrl(image?.sourceUrl)} alt={image?.altText ?? artwork.title} />
                  <p>{artwork.title}</p>
                </Link>
                {artwork.artist && <p>{artwork.artist.name}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
