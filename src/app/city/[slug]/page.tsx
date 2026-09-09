import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCity } from "@/lib/queries/get-city";
import CitySavedWorks from "@/components/CitySavedWorks";

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCity(prisma, slug);
  if (!data) notFound();

  const { cityName, institutions } = data;

  return (
    <main>
      <h1>{cityName}</h1>

      <CitySavedWorks cityName={cityName} />

      {institutions.map((institution) => (
        <section key={institution.id} aria-labelledby={`institution-${institution.slug}`}>
          <h2 id={`institution-${institution.slug}`}>
            <Link href={`/museum/${institution.slug}`}>{institution.name}</Link>
          </h2>
          <ul>
            {institution.physicalObjects.map((po) => {
              const image = po.images[0];
              return (
                <li key={po.id}>
                  <Link href={`/artwork/${po.artwork.slug}`}>
                    {image && <img src={image.sourceUrl} alt={image.altText ?? po.artwork.title} width={120} loading="lazy" />}
                    {po.artwork.title}
                    {po.artwork.artist && <> — {po.artwork.artist.name}</>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
