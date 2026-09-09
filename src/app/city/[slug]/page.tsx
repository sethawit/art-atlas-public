import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCity } from "@/lib/queries/get-city";
import CitySavedWorks from "@/components/CitySavedWorks";
import { proxiedImageUrl } from "@/lib/images/proxied-image-url";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCity(prisma, slug);
  if (!data) return {};

  const workCount = data.institutions.reduce((sum, i) => sum + i.physicalObjects.length, 0);
  return {
    title: data.cityName,
    description: `${data.institutions.length} institution${data.institutions.length === 1 ? "" : "s"}, ${workCount} catalogued works in ${data.cityName}.`,
  };
}

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
      ))}
    </main>
  );
}
