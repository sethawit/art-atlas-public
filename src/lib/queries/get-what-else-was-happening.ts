import type { PrismaClient } from "@prisma/client";
import { resolveImageUrl } from "@/lib/images/proxied-image-url";

export interface ContemporaryEntry {
  slug: string;
  title: string;
  artistName: string | null;
  placeOrCulture: string | null;
  dateDisplay: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

export interface WhatElseWasHappeningResult {
  windowYears: number;
  entries: ContemporaryEntry[];
}

const CAP = 8;
// A generation-scale window, not a strict single-year match — most catalogue dates are
// themselves approximate ("c. 1889"), so a tight window would mostly return nothing.
const WINDOW_YEARS = 25;

/**
 * §5 "What else was happening then?" — surfaces other artworks made around the same time,
 * favoring ones from a different placeOrCulture so the result reads as "the wider world at
 * that moment" rather than a second history of the same tradition. Built on the
 * placeOrCulture backfill (Met `culture`/`department`, AIC `place_of_origin` — see
 * normalize-met.ts/normalize-aic.ts) — honestly null for pieces neither source labeled.
 * Like "Why does this look familiar?", this is a real read over existing data, not a
 * documented claim: two pieces sharing an approximate date window is not evidence they are
 * connected.
 */
export async function getWhatElseWasHappening(
  prisma: PrismaClient,
  artworkId: string
): Promise<WhatElseWasHappeningResult> {
  const anchorAssertion = await prisma.assertion.findFirst({
    where: { subjectType: "Artwork", subjectId: artworkId, field: "creationDate", isPreferred: true },
    select: { valueEarliest: true },
  });
  if (!anchorAssertion?.valueEarliest) return { windowYears: WINDOW_YEARS, entries: [] };

  const anchorYear = anchorAssertion.valueEarliest.getUTCFullYear();
  const anchor = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { placeOrCulture: true },
  });

  const from = new Date(Date.UTC(anchorYear - WINDOW_YEARS, 0, 1));
  const to = new Date(Date.UTC(anchorYear + WINDOW_YEARS, 11, 31));

  const matches = await prisma.assertion.findMany({
    where: {
      subjectType: "Artwork",
      field: "creationDate",
      isPreferred: true,
      subjectId: { not: artworkId },
      valueEarliest: { gte: from, lte: to },
    },
    select: { subjectId: true, value: true, valueEarliest: true },
  });
  if (matches.length === 0) return { windowYears: WINDOW_YEARS, entries: [] };

  const artworks = await prisma.artwork.findMany({
    where: { id: { in: matches.map((m) => m.subjectId) } },
    include: { artist: true, physicalObjects: { include: { images: { where: { removedAt: null }, take: 1 } } } },
  });
  const artworkById = new Map(artworks.map((a) => [a.id, a]));

  // Prefer a different placeOrCulture from the anchor's — that's the point of the
  // feature (§5: contextualize against the wider world, not just repeat the anchor's own
  // tradition) — but fall back to same-culture matches rather than showing nothing when
  // that's all the window has.
  const scored = matches
    .map((m) => {
      const artwork = artworkById.get(m.subjectId);
      if (!artwork) return null;
      const distinctPlace = anchor?.placeOrCulture && artwork.placeOrCulture && artwork.placeOrCulture !== anchor.placeOrCulture;
      return { match: m, artwork, priority: distinctPlace ? 0 : 1 };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.priority - b.priority || a.artwork.title.localeCompare(b.artwork.title))
    .slice(0, CAP);

  const entries: ContemporaryEntry[] = scored.map(({ match, artwork }) => {
    const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
    return {
      slug: artwork.slug,
      title: artwork.title,
      artistName: artwork.artist?.name ?? null,
      placeOrCulture: artwork.placeOrCulture,
      dateDisplay: match.value,
      imageUrl: resolveImageUrl(image) ?? null,
      imageAlt: image?.altText ?? null,
    };
  });

  return { windowYears: WINDOW_YEARS, entries };
}
