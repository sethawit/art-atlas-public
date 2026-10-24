import type { ClevelandArtwork } from "@/lib/cleveland/client";
import type { NormalizedArtwork, NormalizedAssertion } from "@/lib/ingest/normalize-met";
import { safeYearDate, slugify } from "@/lib/ingest/normalize-met";

const CLEVELAND_OPEN_ACCESS_URL = "https://www.clevelandart.org/open-access";

/**
 * Split a Cleveland creator description, "Claude Monet (French, 1840–1926)", into the
 * name and the parenthesised bio. Cleveland gives no separate name field.
 */
export function parseClevelandCreator(description: string): { name: string; bio: string | null } {
  const match = description.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (!match) return { name: description.trim(), bio: null };
  return { name: match[1].trim(), bio: match[2].trim() || null };
}

/**
 * Normalize a raw Cleveland Museum of Art record into the core data model's shape, the
 * same contract as normalizeMetObject. Pure function, no I/O.
 */
export function normalizeClevelandArtwork(obj: ClevelandArtwork): NormalizedArtwork {
  const creator = obj.creators.find((c) => c.role === "artist") ?? obj.creators[0];
  const parsed = creator ? parseClevelandCreator(creator.description) : null;
  const artist = parsed?.name ? { slug: slugify(parsed.name), name: parsed.name } : null;

  // Only CC0 records carry reusable images; the web rendition (~900px) is the right size
  // for display, where the print rendition runs to several megabytes.
  const image =
    obj.share_license_status === "CC0" && obj.images?.web?.url
      ? {
          sourceUrl: obj.images.web.url,
          credit: obj.credit_line || null,
          rightsUrl: CLEVELAND_OPEN_ACCESS_URL,
          altText: `${obj.title}, ${parsed?.name || "artist unknown"}`,
        }
      : null;

  const assertions: NormalizedAssertion[] = [];

  if (obj.creation_date) {
    const precision: NormalizedAssertion["precision"] = obj.creation_date.includes("?")
      ? "disputed"
      : obj.creation_date_earliest === obj.creation_date_latest
        ? "exact"
        : "approximate";

    assertions.push({
      field: "creationDate",
      value: obj.creation_date,
      valueEarliest: safeYearDate(obj.creation_date_earliest, 0, 1),
      valueLatest: safeYearDate(obj.creation_date_latest, 11, 31),
      precision,
    });
  }

  if (parsed?.bio) {
    assertions.push({ field: "artistBio", value: parsed.bio });
  }

  assertions.push({ field: "sourceRecordUrl", value: obj.url });

  return {
    slug: slugify(obj.title),
    title: obj.title,
    placeOrCulture: obj.culture[0]?.trim() || null,
    artist,
    institution: { slug: "cleveland-museum-of-art", name: "The Cleveland Museum of Art", city: "Cleveland" },
    physicalObject: {
      accessionNumber: obj.accession_number || null,
      medium: obj.technique || null,
      dimensions: obj.measurements || null,
    },
    image,
    assertions,
    sourceUrl: obj.url,
    rawRecord: obj,
    galleryLocation: obj.current_location?.trim() || null,
  };
}
