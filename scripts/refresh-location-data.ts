// Usage: npx tsx scripts/refresh-location-data.ts
// §9 item 9: "Refresh changeable data separately from relatively stable art-history
// metadata." Unlike backfill-place-or-culture.ts (a full re-ingest — medium, dimensions,
// images, provenance, everything), this touches only displayStatus/galleryLocation.
// For AIC, that means a genuinely minimal request (`fields=id,gallery_title`, ~100 bytes
// vs. the full object) — real bandwidth savings, not just a narrower write. The Met API
// has no field-selection support (confirmed in the source register), so its request size
// is the same as a full ingest; the separation there is still real at the write level
// (this never touches medium/dimensions/images/assertions), just not at the fetch level.
import { prisma } from "@/lib/prisma";
import { fetchMetObject } from "@/lib/met/client";
import { fetchAicGalleryLocation } from "@/lib/aic/client";
import { refreshLocationData } from "@/lib/ingest/refresh-location-data";

const MET_SOURCE = { name: "Met Collection API", url: "https://collectionapi.metmuseum.org/public/collection/v1" };
const AIC_SOURCE = { name: "Art Institute of Chicago API", url: "https://api.artic.edu/api/v1" };
const AIC_REQUEST_SPACING_MS = 1100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const physicalObjects = await prisma.physicalObject.findMany({
  where: { externalRecordUrl: { not: null } },
  select: { id: true, externalRecordUrl: true },
});

let metCount = 0;
let aicCount = 0;
let nowOnDisplay = 0;
let failed = 0;

for (const po of physicalObjects) {
  const url = po.externalRecordUrl!;
  try {
    if (url.includes("metmuseum.org")) {
      const objectId = Number(url.split("/").pop());
      const raw = await fetchMetObject(objectId);
      const result = await refreshLocationData(prisma, po.id, raw.GalleryNumber?.trim() || null, MET_SOURCE);
      if (result.displayStatus === "on_display") nowOnDisplay++;
      metCount++;
    } else if (url.includes("artic.edu")) {
      const artworkId = Number(url.split("/").pop());
      await sleep(AIC_REQUEST_SPACING_MS);
      const galleryLocation = await fetchAicGalleryLocation(artworkId);
      const result = await refreshLocationData(prisma, po.id, galleryLocation, AIC_SOURCE);
      if (result.displayStatus === "on_display") nowOnDisplay++;
      aicCount++;
    } else {
      console.warn(`Unrecognized source URL, skipped: ${url}`);
    }
  } catch (err) {
    failed++;
    console.error(`Failed to refresh location for ${url}: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`Location refresh complete: ${metCount} Met, ${aicCount} AIC, ${failed} failed.`);
console.log(`Now on_display: ${nowOnDisplay} / ${metCount + aicCount}.`);

await prisma.$disconnect();
