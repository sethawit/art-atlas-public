import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { cleanupByRunId } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import { listUnreviewedJourneyEvents } from "@/lib/admin/queries";
import { getJourney } from "@/lib/queries/get-journey";

// reviewOwnershipEvent/reviewExhibitionEvent (src/lib/admin/actions.ts) are "use server"
// Server Actions that call revalidatePath — that needs a real Next.js request context
// and throws ("static generation store missing") when called directly in a vitest test,
// same as every other admin action here (none of them are unit-tested directly; this
// project verifies them live in the browser instead — see ticket 25 follow-up's file).
// These tests exercise the same underlying mutation the action performs, and the review
// queue/public-Journey queries that depend on its result; the Server Action wiring
// itself (button -> action -> revalidate) is verified live.

const runId = newRunId();

afterAll(async () => {
  await cleanupByRunId(prisma, runId);
  await prisma.$disconnect();
});

let physicalObjectId: string;
let ownershipEventId: string;
let exhibitionEventId: string;

beforeAll(async () => {
  const source = await prisma.source.create({ data: { name: `Journey Review Source ${runId}`, url: `https://example.org/${runId}` } });
  const artwork = await prisma.artwork.create({ data: { slug: `journey-review-${runId}`, title: `Journey Review ${runId}` } });
  const physicalObject = await prisma.physicalObject.create({ data: { artworkId: artwork.id } });
  physicalObjectId = physicalObject.id;

  const ownershipEvent = await prisma.ownershipEvent.create({
    data: { physicalObjectId, sequence: 0, description: `Test owner ${runId}`, sourceId: source.id, retrievedAt: new Date() },
  });
  ownershipEventId = ownershipEvent.id;

  const exhibitionEvent = await prisma.exhibitionEvent.create({
    data: { physicalObjectId, sequence: 0, description: `Test exhibition ${runId}`, sourceId: source.id, retrievedAt: new Date() },
  });
  exhibitionEventId = exhibitionEvent.id;
});

describe("journey review", () => {
  it("new events default to unreviewed and show up in the review queue", async () => {
    const { ownership, exhibitions } = await listUnreviewedJourneyEvents(prisma);
    expect(ownership.some((e) => e.id === ownershipEventId)).toBe(true);
    expect(exhibitions.some((e) => e.id === exhibitionEventId)).toBe(true);
  });

  it("approving an event (the mutation reviewOwnershipEvent performs) removes it from the queue but keeps it public", async () => {
    await prisma.ownershipEvent.update({ where: { id: ownershipEventId }, data: { reviewStatus: "approved" } });

    const { ownership } = await listUnreviewedJourneyEvents(prisma);
    expect(ownership.some((e) => e.id === ownershipEventId)).toBe(false);

    const journey = await getJourney(prisma, physicalObjectId);
    expect(journey.ownership.some((e) => e.sequence === 0)).toBe(true);
  });

  it("flagging an event (the mutation reviewExhibitionEvent performs) hides it from the public Journey", async () => {
    await prisma.exhibitionEvent.update({ where: { id: exhibitionEventId }, data: { reviewStatus: "flagged" } });

    const journey = await getJourney(prisma, physicalObjectId);
    expect(journey.exhibitions.some((e) => e.description.includes("Test exhibition"))).toBe(false);

    const row = await prisma.exhibitionEvent.findUniqueOrThrow({ where: { id: exhibitionEventId } });
    expect(row.reviewStatus).toBe("flagged");
  });
});
