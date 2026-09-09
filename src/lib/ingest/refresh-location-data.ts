import type { PrismaClient } from "@prisma/client";

/**
 * §9 item 9: "Refresh changeable data separately from relatively stable art-history
 * metadata." Ticket 29's `writeNormalizedArtwork` writes displayStatus/galleryLocation
 * alongside everything else (medium, dimensions, images, provenance) on every ingest —
 * correct for a first ingest or a full re-sync, but not a distinct "just check what
 * changes often" path. This is that path: touches only `PhysicalObject.displayStatus`/
 * `galleryLocation` and their `LocationAssertion` rows, nothing else — no image
 * re-fetch, no assertion diffing, no provenance re-parsing.
 */
export async function refreshLocationData(
  prisma: PrismaClient,
  physicalObjectId: string,
  galleryLocation: string | null,
  source: { name: string; url: string }
) {
  const retrievedAt = new Date();
  const displayStatus = galleryLocation ? "on_display" : "unconfirmed";

  const sourceRow =
    (await prisma.source.findFirst({ where: { name: source.name } })) ??
    (await prisma.source.create({ data: source }));

  await prisma.physicalObject.update({
    where: { id: physicalObjectId },
    data: { displayStatus, galleryLocation },
  });

  const sourceStatement = galleryLocation
    ? `${source.name} lists this object's current location as "${galleryLocation}".`
    : `${source.name} gives no gallery location for this object; defaults to "unconfirmed" rather than guessing whether that means off view or simply unreported.`;
  const verificationStatus = galleryLocation ? "verified" : "unconfirmed";

  await prisma.locationAssertion.upsert({
    where: { physicalObjectId_field: { physicalObjectId, field: "displayStatus" } },
    update: { value: displayStatus, sourceStatement, sourceId: sourceRow.id, retrievedAt, verificationStatus },
    create: {
      physicalObjectId,
      field: "displayStatus",
      value: displayStatus,
      sourceStatement,
      sourceId: sourceRow.id,
      retrievedAt,
      verificationStatus,
    },
  });

  return { displayStatus, galleryLocation };
}
