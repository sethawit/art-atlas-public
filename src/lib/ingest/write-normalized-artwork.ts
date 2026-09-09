import type { PrismaClient, Prisma } from "@prisma/client";
import type { NormalizedArtwork } from "@/lib/ingest/normalize-met";

/**
 * Write a NormalizedArtwork (from any source's normalizer) into the core data model.
 *
 * Identity is keyed on PhysicalObject.externalRecordUrl (the source's own canonical
 * record URL, e.g. the Met/AIC object page) — NOT on Artwork.slug. Two different physical
 * objects can legitimately slugify to the same title (two different "Self-Portrait"
 * paintings, say); when that happens this function never silently merges them into one
 * Artwork or overwrites one's PhysicalObject with the other's data. Instead it creates a
 * second, disambiguated Artwork and raises a DuplicateFlag for review — "matching titles
 * … are insufficient to merge physical objects" (master prompt §9/ticket 05).
 *
 * Assertions are append-only history: a re-ingest records a fresh retrieval rather than
 * silently overwriting what a prior run observed.
 */
export async function writeNormalizedArtwork(
  prisma: PrismaClient,
  normalized: NormalizedArtwork,
  source: { name: string; url: string }
) {
  const retrievedAt = new Date();
  // Ticket 29: "on_display" only on real positive evidence (a gallery location the
  // source actually gives) — never inferred from its absence, which could just as
  // easily mean "off view" or "unreported." §7: "do not turn uncertainty into exact
  // values just to fill the interface."
  const displayStatus = normalized.galleryLocation ? "on_display" : "unconfirmed";

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

  const { artwork, physicalObject, duplicateFlagged } = await resolveArtworkAndPhysicalObject(
    prisma,
    normalized,
    institution.id,
    artist?.id,
    displayStatus
  );

  if (normalized.image) {
    const existingImage = await prisma.imageAsset.findFirst({
      where: { physicalObjectId: physicalObject.id, removedAt: null },
    });
    if (existingImage) {
      await prisma.imageAsset.update({ where: { id: existingImage.id }, data: normalized.image });
    } else {
      await prisma.imageAsset.create({ data: { physicalObjectId: physicalObject.id, ...normalized.image } });
    }
  }

  // §7/§10 LocationAssertion (ticket 27/29 follow-ups): the real sourced record behind
  // displayStatus/publicAccess, written on every ingest/re-ingest so retrievedAt always
  // reflects the last real sync. displayStatus now has real per-object evidence when the
  // source gives a gallery location (ticket 29) — both fields live in the shared path
  // since both sources are treated identically (verified public museums; a gallery
  // location, when given, is equally real evidence from either one).
  const displayStatusStatement = normalized.galleryLocation
    ? `${source.name} lists this object's current location as "${normalized.galleryLocation}".`
    : `${source.name} gives no gallery location for this object; defaults to "unconfirmed" rather than guessing whether that means off view or simply unreported.`;
  await prisma.locationAssertion.upsert({
    where: { physicalObjectId_field: { physicalObjectId: physicalObject.id, field: "displayStatus" } },
    update: {
      value: displayStatus,
      sourceStatement: displayStatusStatement,
      sourceId: sourceRow.id,
      retrievedAt,
      verificationStatus: normalized.galleryLocation ? "verified" : "unconfirmed",
    },
    create: {
      physicalObjectId: physicalObject.id,
      field: "displayStatus",
      value: displayStatus,
      sourceStatement: displayStatusStatement,
      sourceId: sourceRow.id,
      retrievedAt,
      verificationStatus: normalized.galleryLocation ? "verified" : "unconfirmed",
    },
  });
  await prisma.locationAssertion.upsert({
    where: { physicalObjectId_field: { physicalObjectId: physicalObject.id, field: "publicAccess" } },
    update: { value: physicalObject.publicAccess, sourceId: sourceRow.id, retrievedAt },
    create: {
      physicalObjectId: physicalObject.id,
      field: "publicAccess",
      value: physicalObject.publicAccess,
      sourceStatement: `${institution.name} is a verified public museum offering public access (source register: ${source.url}).`,
      sourceId: sourceRow.id,
      retrievedAt,
      verificationStatus: "verified",
    },
  });

  for (const assertion of normalized.assertions) {
    const mostRecent = await prisma.assertion.findFirst({
      where: { subjectType: "Artwork", subjectId: artwork.id, field: assertion.field },
      orderBy: { retrievedAt: "desc" },
    });
    // Unchanged re-observation from the same source — skip, don't pad history with noise.
    if (mostRecent && mostRecent.value === assertion.value && mostRecent.sourceId === sourceRow.id) continue;

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
        // First-ever observation for this field is auto-preferred; a second, competing
        // one needs an admin to pick between them (§9 point 7 / ticket 05's review UI).
        isPreferred: !mostRecent,
      },
    });
  }

  return { artwork, physicalObject, institution, artist, sourceUrl: normalized.sourceUrl, duplicateFlagged };
}

async function resolveArtworkAndPhysicalObject(
  prisma: PrismaClient,
  normalized: NormalizedArtwork,
  institutionId: string,
  artistId: string | undefined,
  displayStatus: string
) {
  // Seen this exact source record before? Re-ingest: update in place, same Artwork.
  const existingByExternalUrl = await prisma.physicalObject.findUnique({
    where: { externalRecordUrl: normalized.sourceUrl },
    include: { artwork: true },
  });
  if (existingByExternalUrl) {
    const artwork = await prisma.artwork.update({
      where: { id: existingByExternalUrl.artworkId },
      data: { title: normalized.title, artistId, placeOrCulture: normalized.placeOrCulture },
    });
    const physicalObject = await prisma.physicalObject.update({
      where: { id: existingByExternalUrl.id },
      data: {
        institutionId,
        ...normalized.physicalObject,
        rawRecord: normalized.rawRecord as Prisma.InputJsonValue,
        galleryLocation: normalized.galleryLocation,
        displayStatus,
      },
    });
    return { artwork, physicalObject, duplicateFlagged: false };
  }

  const existingBySlug = await prisma.artwork.findUnique({ where: { slug: normalized.slug } });
  if (!existingBySlug) {
    const artwork = await prisma.artwork.create({
      data: { slug: normalized.slug, title: normalized.title, artistId, placeOrCulture: normalized.placeOrCulture },
    });
    const physicalObject = await prisma.physicalObject.create({
      data: {
        artworkId: artwork.id,
        institutionId,
        externalRecordUrl: normalized.sourceUrl,
        ...normalized.physicalObject,
        rawRecord: normalized.rawRecord as Prisma.InputJsonValue,
        galleryLocation: normalized.galleryLocation,
        displayStatus,
      },
    });
    return { artwork, physicalObject, duplicateFlagged: false };
  }

  // Slug collision with an unrelated source record: never merge. Disambiguate a new
  // Artwork and flag the pair for human review.
  const disambiguatedSlug = await nextAvailableSlug(prisma, normalized.slug, normalized.institution.slug);
  const artwork = await prisma.artwork.create({
    data: { slug: disambiguatedSlug, title: normalized.title, artistId, placeOrCulture: normalized.placeOrCulture },
  });
  const physicalObject = await prisma.physicalObject.create({
    data: {
      artworkId: artwork.id,
      institutionId,
      externalRecordUrl: normalized.sourceUrl,
      ...normalized.physicalObject,
      rawRecord: normalized.rawRecord as Prisma.InputJsonValue,
      galleryLocation: normalized.galleryLocation,
      displayStatus,
    },
  });
  await prisma.duplicateFlag.create({
    data: {
      artworkAId: existingBySlug.id,
      artworkBId: artwork.id,
      reason: `Same title "${normalized.title}" from a different source record — not verified as the same physical work.`,
    },
  });
  return { artwork, physicalObject, duplicateFlagged: true };
}

async function nextAvailableSlug(prisma: PrismaClient, baseSlug: string, institutionSlug: string) {
  const candidate = `${baseSlug}-${institutionSlug}`;
  if (!(await prisma.artwork.findUnique({ where: { slug: candidate } }))) return candidate;
  for (let n = 2; ; n++) {
    const numbered = `${candidate}-${n}`;
    if (!(await prisma.artwork.findUnique({ where: { slug: numbered } }))) return numbered;
  }
}
