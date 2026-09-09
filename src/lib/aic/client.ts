// Art Institute of Chicago API adapter — no API key required, but the docs request an
// AIC-User-Agent header (see docs/sources/source-register.md). Field list is not
// exhaustively documented upstream, so every field this adapter requests was confirmed
// live against a real object (id 28560, "The Bedroom") — see the source register.

const BASE_URL = "https://api.artic.edu/api/v1";
const IIIF_BASE_URL = "https://www.artic.edu/iiif/2";
const USER_AGENT = "ArtAtlas (Phase 1 ingestion; contact via repo)";

const ARTWORK_FIELDS = [
  "id",
  "title",
  "thumbnail",
  "date_display",
  "date_start",
  "date_end",
  "artist_display",
  "artist_title",
  "place_of_origin",
  "dimensions",
  "medium_display",
  "credit_line",
  "is_public_domain",
  "copyright_notice",
  "term_titles",
  "style_title",
  "image_id",
  // Ticket 25 (Phase 2) — real museum-published provenance/exhibition text. Confirmed
  // live: present on roughly 40% of a general sample, null on the rest (not every AIC
  // record has this research done) — see ticket 25's file.
  "provenance_text",
  "exhibition_history",
  // Ticket 29 — real, current gallery location when the piece is on view.
  "gallery_title",
].join(",");

export interface AicThumbnail {
  alt_text: string | null;
}

export interface AicArtwork {
  id: number;
  title: string;
  thumbnail: AicThumbnail | null;
  date_display: string;
  date_start: number | null;
  date_end: number | null;
  artist_display: string;
  artist_title: string | null;
  place_of_origin: string | null;
  dimensions: string | null;
  medium_display: string | null;
  credit_line: string | null;
  is_public_domain: boolean;
  copyright_notice: string | null;
  term_titles: string[] | null;
  style_title: string | null;
  image_id: string | null;
  provenance_text: string | null;
  exhibition_history: string | null;
  gallery_title: string | null;
}

export class AicApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AicApiError";
  }
}

function headers(): HeadersInit {
  return { "AIC-User-Agent": USER_AGENT };
}

/** IIIF full-image URL for an artwork's image_id, per the source register's documented pattern. */
export function aicImageUrl(imageId: string, width = 843): string {
  return `${IIIF_BASE_URL}/${imageId}/full/${width},/0/default.jpg`;
}

/** Canonical public artwork page for an id — redirects to the full slugged URL. */
export function aicArtworkPageUrl(id: number): string {
  return `https://www.artic.edu/artworks/${id}`;
}

export async function fetchAicArtwork(id: number): Promise<AicArtwork> {
  const res = await fetch(`${BASE_URL}/artworks/${id}?fields=${ARTWORK_FIELDS}`, { headers: headers() });
  if (!res.ok) {
    throw new AicApiError(`AIC API returned ${res.status} for artwork ${id}`, res.status);
  }
  const body = (await res.json()) as { data: AicArtwork };
  return body.data;
}

/**
 * Ticket 29 — §9 item 9: "Refresh changeable data separately from relatively stable
 * art-history metadata." A minimal request (`fields=id,gallery_title`, confirmed live to
 * return just those two keys) for the one field that actually changes — avoids
 * re-fetching medium/dimensions/provenance/images just to check display location, per
 * §13's "avoid fetching entire external catalogues during page loads" spirit applied to
 * refresh jobs too.
 */
export async function fetchAicGalleryLocation(id: number): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/artworks/${id}?fields=id,gallery_title`, { headers: headers() });
  if (!res.ok) {
    throw new AicApiError(`AIC API returned ${res.status} for artwork ${id}`, res.status);
  }
  const body = (await res.json()) as { data: { gallery_title: string | null } };
  return body.data.gallery_title?.trim() || null;
}

export interface AicSearchResult {
  total: number;
  data: { id: number }[];
}

/**
 * Search for artwork ids matching a query, gated to public-domain results. page/limit
 * pagination per the source register (limit max 100, default page size 12). Exercised
 * here so the shape is proven before bulk ingestion (ticket 05) depends on it.
 */
export async function searchAicArtworkIds(
  query: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {}
): Promise<AicSearchResult> {
  const url = new URL(`${BASE_URL}/artworks/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("query[term][is_public_domain]", "true");
  url.searchParams.set("fields", "id");
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) {
    throw new AicApiError(`AIC API search returned ${res.status} for query "${query}"`, res.status);
  }
  const body = (await res.json()) as { pagination: { total: number }; data: { id: number }[] };
  return { total: body.pagination.total, data: body.data };
}
