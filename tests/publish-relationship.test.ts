import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { publishRelationship } from "@/lib/relationships/publish-relationship";

afterAll(async () => {
  await prisma.$disconnect();
});

const runId = Date.now().toString(36);

async function seedArtwork(slug: string, title: string) {
  return prisma.artwork.create({ data: { slug: `${slug}-${runId}`, title } });
}

describe("publishRelationship", () => {
  it("keeps distinct evidence URLs separate even when two citations share a source name", async () => {
    // Regression test for a real bug caught during ticket 09: reusing a Source row by
    // NAME (not URL) silently misattributed one relationship's citation link to a
    // different relationship's evidence page.
    const a = await seedArtwork("rel-a", "Relationship Test A");
    const b = await seedArtwork("rel-b", "Relationship Test B");
    const c = await seedArtwork("rel-c", "Relationship Test C");

    const sameGenericName = `Shared Catalogue Name ${runId}`;

    const rel1 = await publishRelationship(prisma, {
      subjectSlug: a.slug,
      objectSlug: b.slug,
      type: "same_series",
      explanation: "Test relationship one.",
      evidence: { sourceName: sameGenericName, sourceUrl: `https://example.org/page-one-${runId}` },
    });

    const rel2 = await publishRelationship(prisma, {
      subjectSlug: a.slug,
      objectSlug: c.slug,
      type: "documented_influence",
      explanation: "Test relationship two.",
      evidence: { sourceName: sameGenericName, sourceUrl: `https://example.org/page-two-${runId}` },
    });

    const source1 = await prisma.source.findUniqueOrThrow({ where: { id: rel1.evidenceSourceId } });
    const source2 = await prisma.source.findUniqueOrThrow({ where: { id: rel2.evidenceSourceId } });

    expect(source1.id).not.toBe(source2.id);
    expect(source1.url).toBe(`https://example.org/page-one-${runId}`);
    expect(source2.url).toBe(`https://example.org/page-two-${runId}`);
  });

  it("is idempotent: re-publishing the same relationship updates rather than duplicates", async () => {
    const a = await seedArtwork("rel-idem-a", "Idempotent Test A");
    const b = await seedArtwork("rel-idem-b", "Idempotent Test B");

    const first = await publishRelationship(prisma, {
      subjectSlug: a.slug,
      objectSlug: b.slug,
      type: "same_series",
      explanation: "Original explanation.",
      evidence: { sourceName: `Idempotent Source ${runId}`, sourceUrl: `https://example.org/idempotent-${runId}` },
    });

    const second = await publishRelationship(prisma, {
      subjectSlug: a.slug,
      objectSlug: b.slug,
      type: "same_series",
      explanation: "Updated explanation.",
      evidence: { sourceName: `Idempotent Source ${runId}`, sourceUrl: `https://example.org/idempotent-${runId}` },
    });

    expect(second.id).toBe(first.id);
    expect(second.explanation).toBe("Updated explanation.");

    const count = await prisma.relationship.count({
      where: { subjectArtworkId: a.id, objectArtworkId: b.id },
    });
    expect(count).toBe(1);
  });
});
