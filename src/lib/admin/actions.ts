"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Gated by src/middleware.ts's HTTP Basic Auth on /admin/:path* (ticket 19) — a Server
// Action call POSTs back to the page it was invoked from, so the same matcher covers
// these too, not just page loads.

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

/**
 * §9 item 7's provenance review (ticket 25 follow-up): approve a segment as reviewed, or
 * flag it to hide it from the public Journey tab (getJourney excludes "flagged" — see
 * that query's comment). Never deletes the row, same soft-hide shape as removeImage.
 */
export async function reviewOwnershipEvent(eventId: string, decision: "approved" | "flagged") {
  await prisma.ownershipEvent.update({ where: { id: eventId }, data: { reviewStatus: decision } });
  revalidatePath("/admin/journey");
  revalidatePath("/artwork/[slug]", "page");
}

export async function reviewExhibitionEvent(eventId: string, decision: "approved" | "flagged") {
  await prisma.exhibitionEvent.update({ where: { id: eventId }, data: { reviewStatus: decision } });
  revalidatePath("/admin/journey");
  revalidatePath("/artwork/[slug]", "page");
}

/**
 * §10's `Relationship.reviewStatus` — corrective, not a pending-approval queue (every
 * row is already hand-researched before `publishRelationship` writes it, defaulting to
 * "approved" — see the schema comment). This lets an admin flag one found to be wrong
 * after publish, hiding it from Related pieces / "looks familiar" / Compare without
 * deleting the row.
 */
export async function reviewRelationship(relationshipId: string, decision: "approved" | "flagged") {
  await prisma.relationship.update({ where: { id: relationshipId }, data: { reviewStatus: decision } });
  revalidatePath("/admin/artworks/[slug]", "page");
  revalidatePath("/artwork/[slug]", "page");
}
