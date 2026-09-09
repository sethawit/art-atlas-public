import type { MetObject } from "@/lib/met/client";

export interface NormalizedAssertion {
  field: string;
  value: string;
  valueEarliest?: Date;
  valueLatest?: Date;
  precision?: "exact" | "approximate" | "disputed";
}

export interface NormalizedArtwork {
  slug: string;
  title: string;
  /** Free text, honestly null when the source gives nothing — see Artwork.placeOrCulture in schema.prisma. */
  placeOrCulture: string | null;
  artist: { slug: string; name: string } | null;
  institution: { slug: string; name: string; city: string | null };
  physicalObject: {
    accessionNumber: string | null;
    medium: string | null;
    dimensions: string | null;
  };
  /** null when the object isn't eligible for reuse — the page must render "unavailable", not a broken image. */
  image: { sourceUrl: string; credit: string | null; rightsUrl: string | null; altText: string } | null;
  assertions: NormalizedAssertion[];
  sourceUrl: string;
  /** The whole raw source API response, unmodified — §9 item 2's raw-record retention. */
  rawRecord: unknown;
  /** Real gallery/room location as the source gives it, or null — see PhysicalObject.galleryLocation. */
  galleryLocation: string | null;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

/**
 * A Date for a given AD year, or undefined for a year the DB can't safely round-trip.
 * Postgres/node-postgres serializes a JS Date with a negative (BC) year as a signed
 * extended ISO year ("-002300-01-01…") that the wire protocol rejects outright — found
 * live via Met objectID 329077 ("Head of a ruler ca. 2300–2000 BCE"). Rather than fail
 * ingestion for antiquities, keep the original display text (still preserved in
 * `value`) and drop only the sortable earliest/latest pair for BC-dated works; a future
 * ticket can add proper BC support (e.g. a separate signed-year column) if the catalogue
 * grows to need it.
 */
export function safeYearDate(year: number | null | undefined, month: number, day: number): Date | undefined {
  if (!year || year < 1) return undefined;
  return new Date(Date.UTC(year, month, day));
}

const MET_OPEN_ACCESS_POLICY_URL =
  "https://www.metmuseum.org/about-the-met/policies-and-documents/open-access";

/**
 * Normalize a raw Met API object into the core data model's shape. Pure function — no
 * I/O — so it can be unit-tested against a fixture without a live network call or a
 * database. See docs/sources/source-register.md for the field-level rules this encodes.
 */
export function normalizeMetObject(obj: MetObject): NormalizedArtwork {
  const artistName = obj.artistDisplayName?.trim();
  const artist = artistName ? { slug: slugify(artistName), name: artistName } : null;

  // Register gotcha: isPublicDomain and image-URL presence aren't reliably correlated —
  // both must be checked before treating an image as usable.
  const image =
    obj.isPublicDomain && obj.primaryImage
      ? {
          sourceUrl: obj.primaryImage,
          credit: obj.creditLine || null,
          rightsUrl: MET_OPEN_ACCESS_POLICY_URL,
          altText: `${obj.title}, ${obj.artistDisplayName || "artist unknown"}`,
        }
      : null;

  const assertions: NormalizedAssertion[] = [];

  if (obj.objectDate) {
    // No explicit "disputed" signal in the Met payload; a "?" in the display text is the
    // only hint the docs' example data ever shows for disputed dating. begin === end means
    // a single confirmed year; otherwise treat the range as approximate.
    const precision: NormalizedAssertion["precision"] = obj.objectDate.includes("?")
      ? "disputed"
      : obj.objectBeginDate === obj.objectEndDate
        ? "exact"
        : "approximate";

    assertions.push({
      field: "creationDate",
      value: obj.objectDate,
      valueEarliest: safeYearDate(obj.objectBeginDate, 0, 1),
      valueLatest: safeYearDate(obj.objectEndDate, 11, 31),
      precision,
    });
  }

  if (obj.artistDisplayBio) {
    assertions.push({ field: "artistBio", value: obj.artistDisplayBio });
  }

  if (obj.tags && obj.tags.length > 0) {
    assertions.push({ field: "subjectTags", value: obj.tags.map((t) => t.term).join(", ") });
  }

  // The per-object record URL, recorded as an assertion (not a schema column) so the
  // generic Assertion mechanism is the single place every sourced fact — including "where
  // did this citation come from" — lives. Read by the Sources tab.
  if (obj.objectURL) {
    assertions.push({ field: "sourceRecordUrl", value: obj.objectURL });
  }

  return {
    slug: slugify(obj.title),
    title: obj.title,
    // culture alone under-captures real signal: confirmed live that even Islamic Art and
    // Ancient West Asian Art department objects can have culture: "" (the Met evidently
    // doesn't populate it consistently). department is always present and still a real,
    // source-provided classification — falls back to it rather than leaving these
    // objects with no regional/cultural context at all when culture is blank.
    placeOrCulture: obj.culture?.trim() || obj.department?.trim() || null,
    artist,
    institution: { slug: "the-metropolitan-museum-of-art", name: "The Metropolitan Museum of Art", city: "New York" },
    physicalObject: {
      accessionNumber: obj.accessionNumber || null,
      medium: obj.medium || null,
      dimensions: obj.dimensions || null,
    },
    image,
    assertions,
    sourceUrl: obj.objectURL,
    rawRecord: obj,
    galleryLocation: obj.GalleryNumber?.trim() || null,
  };
}
