import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getInstitutionBySlug } from "@/lib/queries/get-institution-by-slug";

// Minimal — see get-institution-by-slug.ts. Full museum/city page (visit link, hours with
// freshness label, exhibitions) is ticket 10.
export default async function MuseumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const institution = await getInstitutionBySlug(prisma, slug);
  if (!institution) notFound();

  return (
    <main>
      <h1>{institution.name}</h1>
      {institution.city && <p>{institution.city}</p>}

      <section aria-labelledby="works-heading">
        <h2 id="works-heading">Artworks in our catalogue ({institution.physicalObjects.length})</h2>
        <ul>
          {institution.physicalObjects.map((po) => {
            const image = po.images[0];
            return (
              <li key={po.id}>
                <Link href={`/artwork/${po.artwork.slug}`}>
                  {image && <img src={image.sourceUrl} alt={image.altText ?? po.artwork.title} width={120} />}
                  {po.artwork.title}
                  {po.artwork.artist && <> — {po.artwork.artist.name}</>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
