import type { PrismaClient } from "@prisma/client";
import type { NormalizedArtwork } from "@/lib/ingest/normalize-met";

/**
 * Write a NormalizedArtwork (from any source's normalizer) into the core data model.
 * Idempotent by Artwork.slug — re-running for the same source object updates the
 * existing row rather than duplicating it. Assertions are the exception: they're
 * append-only history, so a re-ingest records a fresh retrieval rather than silently
 * overwriting what a prior run observed.
 *
 * Shared by every source's ingest function (ingest-met-artwork.ts, ingest-aic-artwork.ts,
 * …) so the write path — and its idempotency behaviour — is proven once and identical
 * across sources, per ticket 04's point: the artwork page and this write path must
 * generalize across a second source without forking.
 */
export async function writeNormalizedArtwork(
  prisma: PrismaClient,
  normalized: NormalizedArtwork,
  source: { name: string; url: string }
) {
  const retrievedAt = new Date();

  // Source has no natural unique key yet (a future ticket may add one once dedup across
  // many sources matters more) — resolve-or-create explicitly rather than forcing a
  // schema change onto this ticket.
  const sourceRow =
    (await prisma.source.findFirst({ where: { name: source.name } })) ??
    (await prisma.source.create({ data: source }));

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
        sourceId: sourceRow.id,
        retrievedAt,
        isPreferred: true,
      },
    });
  }

  return { artwork, physicalObject, institution, artist, sourceUrl: normalized.sourceUrl };
}
