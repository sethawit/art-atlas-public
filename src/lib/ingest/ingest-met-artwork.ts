import type { PrismaClient } from "@prisma/client";
import { fetchMetObject } from "@/lib/met/client";
import { normalizeMetObject } from "@/lib/ingest/normalize-met";

const SOURCE_NAME = "Met Collection API";
const SOURCE_URL = "https://collectionapi.metmuseum.org/public/collection/v1";

/**
 * Fetch one Met object by id and write it into the core data model. Idempotent by
 * Artwork.slug — re-running for the same objectID updates the existing row rather than
 * duplicating it. Bulk ingestion (ticket 05) will call the same normalize step across
 * many objects; this function is the tracer-bullet proof that the path works end to end.
 */
export async function ingestMetArtwork(prisma: PrismaClient, objectId: number) {
  const raw = await fetchMetObject(objectId);
  const normalized = normalizeMetObject(raw);
  const retrievedAt = new Date();

  // Source has no natural unique key yet (ticket 05 may add one once multiple sources
  // are ingested routinely) — resolve-or-create explicitly rather than forcing a schema
  // change onto this ticket.
  const source =
    (await prisma.source.findFirst({ where: { name: SOURCE_NAME } })) ??
    (await prisma.source.create({ data: { name: SOURCE_NAME, url: SOURCE_URL } }));

  const institution = await prisma.institution.upsert({
    where: { slug: normalized.institution.slug },
    update: { name: normalized.institution.name, city: normalized.institution.city },
    create: normalized.institution,
  });

  const artist = normalized.artist
    ? await prisma.artist.upsert({
        where: { slug: normalized.artist.slug },
        update: { name: normalized.artist.name },
        create: normalized.artist,
      })
    : null;

  const artwork = await prisma.artwork.upsert({
    where: { slug: normalized.slug },
    update: { title: normalized.title, artistId: artist?.id },
    create: { slug: normalized.slug, title: normalized.title, artistId: artist?.id },
  });

  const existingPhysicalObject = await prisma.physicalObject.findFirst({
    where: { artworkId: artwork.id },
  });
  const physicalObject = existingPhysicalObject
    ? await prisma.physicalObject.update({
        where: { id: existingPhysicalObject.id },
        data: { institutionId: institution.id, ...normalized.physicalObject },
      })
    : await prisma.physicalObject.create({
        data: { artworkId: artwork.id, institutionId: institution.id, ...normalized.physicalObject },
      });

  if (normalized.image) {
    const existingImage = await prisma.imageAsset.findFirst({ where: { physicalObjectId: physicalObject.id } });
    if (existingImage) {
      await prisma.imageAsset.update({ where: { id: existingImage.id }, data: normalized.image });
    } else {
      await prisma.imageAsset.create({ data: { physicalObjectId: physicalObject.id, ...normalized.image } });
    }
  }

  // Assertions are append-only history, not upserted — a re-ingest records a fresh
  // retrieval rather than silently overwriting what a prior run observed.
  for (const assertion of normalized.assertions) {
    await prisma.assertion.create({
      data: {
        subjectType: "Artwork",
        subjectId: artwork.id,
        field: assertion.field,
        value: assertion.value,
        valueEarliest: assertion.valueEarliest,
        valueLatest: assertion.valueLatest,
        precision: assertion.precision,
        sourceId: source.id,
        retrievedAt,
        isPreferred: true,
      },
    });
  }

  return { artwork, physicalObject, institution, artist, sourceUrl: normalized.sourceUrl };
}
