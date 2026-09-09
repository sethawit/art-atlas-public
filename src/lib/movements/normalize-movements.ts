import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/ingest/normalize-met";

// Values seen live in styleTitle Assertions that are actually period tags, not named
// movements — AIC's style_title field mixes both. Ticket 08 explicitly requires
// distinguishing period from movement rather than conflating them; this is the one
// classification call this backfill makes, and it's a fixed, reviewed list rather than
// a guess per value.
const PERIOD_VALUES = new Set(["19th century", "18th century", "20th century", "17th century", "16th century"]);

/**
 * Normalize the styleTitle text Assertions already ingested (AIC's style_title field;
 * Met doesn't provide an equivalent) into real MovementStyle entities + ArtworkMovement
 * links, so /movement/<slug> has real data. Idempotent. Deliberately narrow: this reads
 * only styleTitle, not subjectTags (subject tags are far noisier — "Landscapes",
 * "Cypresses" — and conflating them with movements would misrepresent what a "movement"
 * page means).
 */
export async function normalizeMovements(prisma: PrismaClient) {
  const styleAssertions = await prisma.assertion.findMany({
    where: { subjectType: "Artwork", field: "styleTitle" },
  });

  let created = 0;
  let linked = 0;

  for (const assertion of styleAssertions) {
    const name = assertion.value.trim();
    if (!name) continue;
    const kind = PERIOD_VALUES.has(name) ? "period" : "movement";
    const slug = slugify(name);

    const existingMovement = await prisma.movementStyle.findUnique({ where: { slug } });
    const movement =
      existingMovement ?? (await prisma.movementStyle.create({ data: { slug, name, kind } }));
    if (!existingMovement) created++;

    const existingLink = await prisma.artworkMovement.findUnique({
      where: { artworkId_movementId: { artworkId: assertion.subjectId, movementId: movement.id } },
    });
    if (!existingLink) {
      await prisma.artworkMovement.create({
        data: { artworkId: assertion.subjectId, movementId: movement.id },
      });
      linked++;
    }
  }

  return { created, linked, assertionsSeen: styleAssertions.length };
}
