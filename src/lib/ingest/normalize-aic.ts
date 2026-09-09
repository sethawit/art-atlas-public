import type { AicArtwork } from "@/lib/aic/client";
import { aicArtworkPageUrl, aicImageUrl } from "@/lib/aic/client";
import type { NormalizedArtwork, NormalizedAssertion } from "@/lib/ingest/normalize-met";
import { safeYearDate, slugify } from "@/lib/ingest/normalize-met";

/**
 * Normalize a raw AIC API artwork into the core data model's shape — same contract as
 * normalizeMetObject. Pure function, no I/O. See docs/sources/source-register.md for the
 * field-level rules this encodes (is_public_domain gates the image; description/other
 * metadata licensing differs from the Met but doesn't affect this shape).
 */
export function normalizeAicArtwork(obj: AicArtwork): NormalizedArtwork {
  const artistName = (obj.artist_title || obj.artist_display)?.trim();
  const artist = artistName ? { slug: slugify(artistName), name: artistName } : null;

  // Register gotcha: is_public_domain: false artworks can still carry an image_id — both
  // must be checked, exactly as with the Met's isPublicDomain/primaryImage pair.
  const image =
    obj.is_public_domain && obj.image_id
      ? {
          sourceUrl: aicImageUrl(obj.image_id),
          credit: obj.credit_line || null,
          rightsUrl: "https://www.artic.edu/open-access",
          altText: obj.thumbnail?.alt_text || `${obj.title}, ${artistName || "artist unknown"}`,
        }
      : null;

  const assertions: NormalizedAssertion[] = [];

  if (obj.date_display) {
    const precision: NormalizedAssertion["precision"] = obj.date_display.includes("?")
      ? "disputed"
      : obj.date_start != null && obj.date_end != null && obj.date_start === obj.date_end
        ? "exact"
        : "approximate";

    assertions.push({
      field: "creationDate",
      value: obj.date_display,
      valueEarliest: safeYearDate(obj.date_start, 0, 1),
      valueLatest: safeYearDate(obj.date_end, 11, 31),
      precision,
    });
  }

  if (obj.term_titles && obj.term_titles.length > 0) {
    // AIC's term_titles mixes technique/subject/period terms and can repeat — dedupe for
    // display; the original full list is retained verbatim in PhysicalObject.rawRecord.
    const uniqueTerms = Array.from(new Set(obj.term_titles));
    assertions.push({ field: "subjectTags", value: uniqueTerms.join(", ") });
  }

  if (obj.style_title) {
    assertions.push({ field: "styleTitle", value: obj.style_title });
  }

  assertions.push({ field: "sourceRecordUrl", value: aicArtworkPageUrl(obj.id) });

  return {
    slug: slugify(obj.title),
    title: obj.title,
    // AIC gives a specific place ("Saint-Rémy-de-Provence"), not a culture label — a
    // different granularity from the Met's culture field, stored as-is (see
    // Artwork.placeOrCulture in schema.prisma).
    placeOrCulture: obj.place_of_origin?.trim() || null,
    artist,
    institution: { slug: "art-institute-of-chicago", name: "The Art Institute of Chicago", city: "Chicago" },
    physicalObject: {
      accessionNumber: null,
      medium: obj.medium_display || null,
      dimensions: obj.dimensions || null,
    },
    image,
    assertions,
    sourceUrl: aicArtworkPageUrl(obj.id),
    rawRecord: obj,
  };
}
