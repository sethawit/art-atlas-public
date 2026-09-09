import type { PrismaClient } from "@prisma/client";
import { cache } from "react";

/**
 * Load everything the artwork detail page's Overview/Understand/Sources tabs need.
 * Assertions are append-only (a re-ingest adds a fresh row rather than overwriting). For
 * a given field: an explicitly admin-approved value (isPreferred, set via /admin — ticket
 * 05) wins; otherwise fall back to the most recently retrieved one.
 *
 * Wrapped in React's `cache()` (ticket 20) — `generateMetadata` and the page component
 * both call this for the same request; without per-request memoization that's two
 * identical round-trips instead of one. Request-scoped only, not a persistent cache — no
 * interaction with §13's stale-data concern.
 */
export const getArtworkBySlug = cache(async function getArtworkBySlug(prisma: PrismaClient, slug: string) {
  const artwork = await prisma.artwork.findUnique({
    where: { slug },
    include: {
      artist: true,
      physicalObjects: {
        include: { institution: true, images: { where: { removedAt: null } }, locationAssertions: true },
      },
      movements: { include: { movement: true } },
    },
  });
  if (!artwork) return null;

  const assertions = await prisma.assertion.findMany({
    where: { subjectType: "Artwork", subjectId: artwork.id },
    include: { source: true },
    orderBy: { retrievedAt: "desc" },
  });

  const latestByField = new Map<string, (typeof assertions)[number]>();
  for (const assertion of assertions) {
    if (assertion.isPreferred && !latestByField.has(assertion.field)) latestByField.set(assertion.field, assertion);
  }
  for (const assertion of assertions) {
    if (!latestByField.has(assertion.field)) latestByField.set(assertion.field, assertion);
  }

  return {
    artwork,
    physicalObject: artwork.physicalObjects[0] ?? null,
    fields: latestByField,
    allAssertions: assertions,
  };
});

export type ArtworkPageData = NonNullable<Awaited<ReturnType<typeof getArtworkBySlug>>>;
