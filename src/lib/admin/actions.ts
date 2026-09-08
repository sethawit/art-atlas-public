"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// No auth exists in Phase 1 (§2/§3 of the product spec — MVP is account-free). These
// actions are therefore unauthenticated entry points: anyone who can reach /admin can
// call them. That's a recorded, deliberate Phase 1 gap, not an oversight — flag it
// before any public deploy (see the banner on every /admin page).

/**
 * Approve one competing Assertion as the preferred value for its (subject, field) —
 * unsets isPreferred on every sibling. Recorded as an editorial action via
 * selectionReason, distinguishing it from the original source-driven value in the
 * Sources tab's provenance (ticket 05 acceptance: "source changes and editorial changes
 * are distinguishable").
 */
export async function approveAssertion(assertionId: string) {
  const assertion = await prisma.assertion.findUniqueOrThrow({ where: { id: assertionId } });

  await prisma.$transaction([
    prisma.assertion.updateMany({
      where: { subjectType: assertion.subjectType, subjectId: assertion.subjectId, field: assertion.field },
      data: { isPreferred: false },
    }),
    prisma.assertion.update({
      where: { id: assertionId },
      data: {
        isPreferred: true,
        selectionReason: `Editorial: approved by admin on ${new Date().toISOString().slice(0, 10)}.`,
      },
    }),
  ]);

  revalidatePath("/admin/artworks/[slug]", "page");
  revalidatePath("/admin/review");
}

/** Soft-remove an ineligible image without deleting the PhysicalObject/Artwork it belongs to. */
export async function removeImage(imageAssetId: string) {
  await prisma.imageAsset.update({ where: { id: imageAssetId }, data: { removedAt: new Date() } });
  revalidatePath("/admin/artworks/[slug]", "page");
  revalidatePath("/admin/review");
}

/** Resolve a pending duplicate flag: confirm the two Artworks are distinct, or flag them for a future merge decision (ticket 05 never merges automatically). */
export async function resolveDuplicateFlag(flagId: string, resolution: "confirmed_distinct" | "confirmed_duplicate") {
  await prisma.duplicateFlag.update({
    where: { id: flagId },
    data: { status: resolution, resolvedAt: new Date() },
  });
  revalidatePath("/admin/duplicates");
  revalidatePath("/admin");
}
