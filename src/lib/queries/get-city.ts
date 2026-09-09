import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/ingest/normalize-met";

export async function getCity(prisma: PrismaClient, citySlug: string) {
  const institutions = await prisma.institution.findMany({
    include: {
      physicalObjects: {
        include: { artwork: { include: { artist: true } }, images: { where: { removedAt: null }, take: 1 } },
      },
    },
  });
  // City isn't its own entity (no slug column) — match by slugifying Institution.city,
  // same as the museum page's outbound link. Fine at Phase 1 scale (2 institutions);
  // worth a real City entity if the catalogue grows to many cities.
  const matching = institutions.filter((i) => i.city && slugify(i.city) === citySlug);
  if (matching.length === 0) return null;

  return { cityName: matching[0].city!, institutions: matching };
}
