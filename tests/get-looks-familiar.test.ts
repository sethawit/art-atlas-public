import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { cleanupByRunId } from "./helpers/cleanup";
import { prisma } from "@/lib/prisma";
import { getLooksFamiliar } from "@/lib/queries/get-looks-familiar";

const runId = newRunId();

afterAll(async () => {
  await cleanupByRunId(prisma, runId);
  await prisma.$disconnect();
});
const sharedTag = `Cypresses-${runId}`;

async function seedArtwork(slug: string, title: string, medium: string, subjectTags: string | null, sourceId: string) {
  const artwork = await prisma.artwork.create({ data: { slug: `${slug}-${runId}`, title } });
  await prisma.physicalObject.create({ data: { artworkId: artwork.id, medium } });
  if (subjectTags) {
    await prisma.assertion.create({
      data: {
        subjectType: "Artwork",
        subjectId: artwork.id,
        field: "subjectTags",
        value: subjectTags,
        sourceId,
        retrievedAt: new Date(),
        isPreferred: true,
      },
    });
  }
  return artwork;
}

let source: { id: string };
let anchor: { id: string; slug: string };
let sameSubject: { id: string; slug: string };
let sameTechnique: { id: string; slug: string };
let unrelated: { id: string; slug: string };

beforeAll(async () => {
  source = await prisma.source.create({ data: { name: `Familiar Test Source ${runId}`, url: "https://example.org" } });

  // Distinct, runId-tagged medium — "Oil on canvas" alone already matches ~36 real
  // artworks in the shared dev/test database, which would crowd this test's fixture out
  // of findByTechnique's capped result before it ever gets there.
  // Subject tags are likewise runId-tagged — real museum-catalogue vocabulary like
  // "Landscapes"/"Cypresses" already appears on genuine corpus artworks, which would
  // crowd this test's fixture out of findBySubject's CAP-sliced result (same class of
  // bug as testMedium above, found live via 3 consecutive full-suite failures).
  const testMedium = `Test Medium ${runId}`;
  anchor = await seedArtwork("anchor", `Anchor Work ${runId}`, testMedium, `Landscapes-${runId}, ${sharedTag}`, source.id);
  sameSubject = await seedArtwork("same-subject", `Same Subject Work ${runId}`, "Watercolor", `${sharedTag}, Gardens-${runId}`, source.id);
  sameTechnique = await seedArtwork("same-technique", `Same Technique Work ${runId}`, testMedium, "Portraits", source.id);
  unrelated = await seedArtwork("unrelated", `Unrelated Work ${runId}`, "Bronze", null, source.id);

  const movement = await prisma.movementStyle.create({
    data: { slug: `test-movement-${runId}`, name: `Test Movement ${runId}`, kind: "movement" },
  });
  await prisma.artworkMovement.create({ data: { artworkId: anchor.id, movementId: movement.id } });
  await prisma.artworkMovement.create({ data: { artworkId: sameTechnique.id, movementId: movement.id } });

  await prisma.relationship.create({
    data: {
      subjectArtworkId: anchor.id,
      objectArtworkId: unrelated.id,
      relationshipType: "documented_influence",
      explanation: "Test documented influence.",
      evidenceSourceId: source.id,
    },
  });
});

describe("getLooksFamiliar", () => {
  it("finds works sharing a subject tag, naming the actual shared term", async () => {
    const result = await getLooksFamiliar(prisma, anchor.id);
    const match = result.subject.find((e) => e.slug === sameSubject.slug);
    expect(match).toBeTruthy();
    expect(match?.explanation).toContain(sharedTag);
  });

  it("does not include the anchor artwork itself in subject matches", async () => {
    const result = await getLooksFamiliar(prisma, anchor.id);
    expect(result.subject.some((e) => e.slug === anchor.slug)).toBe(false);
  });

  it("finds works sharing the same medium", async () => {
    const result = await getLooksFamiliar(prisma, anchor.id);
    expect(result.technique.some((e) => e.slug === sameTechnique.slug)).toBe(true);
    expect(result.technique.some((e) => e.slug === unrelated.slug)).toBe(false);
  });

  it("finds works sharing a movement", async () => {
    const result = await getLooksFamiliar(prisma, anchor.id);
    expect(result.movement.some((e) => e.slug === sameTechnique.slug)).toBe(true);
  });

  it("surfaces a real documented_influence Relationship as its own category", async () => {
    const result = await getLooksFamiliar(prisma, anchor.id);
    expect(result.documentedInfluence.some((e) => e.slug === unrelated.slug)).toBe(true);
  });

  it("returns empty categories rather than throwing when an artwork has no matches at all", async () => {
    const result = await getLooksFamiliar(prisma, unrelated.id);
    expect(result.subject).toEqual([]);
    expect(result.movement).toEqual([]);
  });
});
