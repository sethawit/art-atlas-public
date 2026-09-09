import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getInstitutionBySlug } from "@/lib/queries/get-institution-by-slug";
import { INSTITUTION_REFERENCE } from "@/lib/institutions/reference";
import { slugify } from "@/lib/ingest/normalize-met";
import { proxiedImageUrl } from "@/lib/images/proxied-image-url";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const institution = await getInstitutionBySlug(prisma, slug);
  if (!institution) return {};

  const count = institution.physicalObjects.length;
  return {
    title: institution.name,
    description: [
      institution.city ? `${institution.name}, ${institution.city}` : institution.name,
      `${count} work${count === 1 ? "" : "s"} in our catalogue`,
    ].join(" — "),
  };
}

export default async function MuseumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const institution = await getInstitutionBySlug(prisma, slug);
  if (!institution) notFound();

  const reference = INSTITUTION_REFERENCE[slug];

  return (
    <main>
      <h1>{institution.name}</h1>
      {institution.city && (
        <p>
          <Link href={`/city/${slugify(institution.city)}`}>{institution.city}</Link>
        </p>
      )}

      {reference ? (
        <p>
          <a href={reference.visitUrl} target="_blank" rel="noopener noreferrer">
            Official visit information
          </a>
        </p>
      ) : (
        <p>No official visit link on file yet for this institution.</p>
      )}

      <p role="note">
        Hours, ticket prices, and current exhibitions aren&apos;t shown here — we don&apos;t
        have a source we can attach a freshness label to yet, and showing stale or
        unsourced hours would be worse than showing none. Check the official visit link
        above before making a trip.
      </p>

      <section aria-labelledby="works-heading">
        <h2 id="works-heading">Artworks in our catalogue ({institution.physicalObjects.length})</h2>
        <ul className="card-grid">
          {institution.physicalObjects.map((po) => {
            const image = po.images[0];
            return (
              <li key={po.id}>
                <Link href={`/artwork/${po.artwork.slug}`}>
                  {image && <img src={proxiedImageUrl(image.sourceUrl)} alt={image.altText ?? po.artwork.title} width={120} loading="lazy" />}
                  {po.artwork.title}
                  {po.artwork.artist && <> — {po.artwork.artist.name}</>}
                </Link>
                {po.galleryLocation && <> — {po.galleryLocation}</>}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
