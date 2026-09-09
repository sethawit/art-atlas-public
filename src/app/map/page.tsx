import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { INSTITUTION_REFERENCE } from "@/lib/institutions/reference";
import InstitutionMap from "@/components/InstitutionMap";

export default async function MapPage() {
  const institutions = await prisma.institution.findMany({
    include: { _count: { select: { physicalObjects: true } } },
    orderBy: { name: "asc" },
  });

  const mapInstitutions = institutions
    .map((i) => {
      const reference = INSTITUTION_REFERENCE[i.slug];
      return reference
        ? { slug: i.slug, name: i.name, artworkCount: i._count.physicalObjects, lat: reference.lat, lng: reference.lng }
        : null;
    })
    .filter((i): i is NonNullable<typeof i> => i !== null);

  return (
    <main>
      <h1>Map</h1>

      {mapInstitutions.length > 0 && <InstitutionMap institutions={mapInstitutions} />}

      {/* Always rendered — the accessible list-view alternative, not gated behind the map mounting. */}
      <section aria-labelledby="list-heading">
        <h2 id="list-heading">Institutions ({institutions.length})</h2>
        <ul>
          {institutions.map((institution) => (
            <li key={institution.id}>
              <Link href={`/museum/${institution.slug}`}>{institution.name}</Link>
              {institution.city && <> — {institution.city}</>} — {institution._count.physicalObjects} artworks
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
