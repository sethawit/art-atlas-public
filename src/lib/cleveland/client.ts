// Cleveland Museum of Art Open Access API adapter. No API key and no documented rate limit
// (see docs/sources/source-register.md). Every field typed here was confirmed live against
// a real object (id 135382, Monet's "The Red Kerchief").

const BASE_URL = "https://openaccess-api.clevelandart.org/api";

export interface ClevelandCreator {
  description: string;
  role: string | null;
}

export interface ClevelandImageRendition {
  url: string;
  width: string;
  height: string;
}

export interface ClevelandArtwork {
  id: number;
  accession_number: string;
  url: string;
  title: string;
  creation_date: string | null;
  creation_date_earliest: number | null;
  creation_date_latest: number | null;
  creators: ClevelandCreator[];
  culture: string[];
  technique: string | null;
  measurements: string | null;
  credit_line: string | null;
  current_location: string | null;
  share_license_status: "CC0" | "Copyrighted" | "Other";
  type: string | null;
  images: { web?: ClevelandImageRendition; print?: ClevelandImageRendition } | null;
}

export class ClevelandApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ClevelandApiError";
  }
}

export async function fetchClevelandArtwork(id: number): Promise<ClevelandArtwork> {
  const res = await fetch(`${BASE_URL}/artworks/${id}`);
  if (!res.ok) {
    throw new ClevelandApiError(`Cleveland API returned ${res.status} for artwork ${id}`, res.status);
  }
  const body = (await res.json()) as { data: ClevelandArtwork };
  return body.data;
}

/**
 * Current gallery for a work, by accession number (the last segment of its record URL),
 * or null when it is not on view. `fields=` keeps this to a ~150-byte response.
 */
export async function fetchClevelandGalleryLocation(accessionNumber: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/artworks/${encodeURIComponent(accessionNumber)}?fields=id,current_location`);
  if (!res.ok) {
    throw new ClevelandApiError(`Cleveland API returned ${res.status} for artwork ${accessionNumber}`, res.status);
  }
  const body = (await res.json()) as { data: { current_location: string | null } };
  return body.data.current_location?.trim() || null;
}

/** Artwork ids matching a query, filtered server-side to CC0 records that carry an image. */
export async function searchClevelandArtworkIds(
  query: string,
  { limit = 25 }: { limit?: number } = {}
): Promise<number[]> {
  const url = new URL(`${BASE_URL}/artworks/`);
  url.searchParams.set("q", query);
  url.searchParams.set("cc0", "1");
  url.searchParams.set("has_image", "1");
  url.searchParams.set("fields", "id");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new ClevelandApiError(`Cleveland API search returned ${res.status} for query "${query}"`, res.status);
  }
  const body = (await res.json()) as { data: { id: number }[] };
  return body.data.map(({ id }) => id);
}
