// Met Collection API adapter — no API key required (confirmed in docs/sources/source-register.md).
// Base URL and endpoint shapes per that register; re-verify there before changing this file.

const BASE_URL = "https://collectionapi.metmuseum.org/public/collection/v1";

export interface MetConstituent {
  constituentID: number;
  role: string;
  name: string;
}

export interface MetObject {
  objectID: number;
  isPublicDomain: boolean;
  isHighlight: boolean;
  accessionNumber: string;
  primaryImage: string;
  additionalImages: string[];
  constituents: MetConstituent[] | null;
  department: string;
  objectName: string;
  title: string;
  culture: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  artistNationality: string;
  artistBeginDate: string;
  artistEndDate: string;
  objectDate: string;
  objectBeginDate: number;
  objectEndDate: number;
  medium: string;
  dimensions: string;
  creditLine: string;
  classification: string;
  rightsAndReproduction: string;
  objectURL: string;
  repository: string;
  metadataDate: string | null;
  tags: { term: string }[] | null;
  GalleryNumber: string;
}

export class MetApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "MetApiError";
  }
}

/** Fetch a single object by its Met objectID. */
export async function fetchMetObject(objectId: number): Promise<MetObject> {
  const res = await fetch(`${BASE_URL}/objects/${objectId}`);
  if (!res.ok) {
    throw new MetApiError(`Met API returned ${res.status} for object ${objectId}`, res.status);
  }
  return res.json() as Promise<MetObject>;
}

export interface MetSearchResult {
  total: number;
  objectIDs: number[] | null;
}

/**
 * Search for object IDs matching a query. The Met search endpoint (v1.1, per the source
 * register) is offset/limit based; offset + limit must stay <= 10,000. Used by bulk
 * ingestion (ticket 05) — exercised here so the pagination shape is proven before that
 * ticket depends on it.
 */
export async function searchMetObjectIds(
  query: string,
  { offset = 0, limit = 100, hasImages = true }: { offset?: number; limit?: number; hasImages?: boolean } = {}
): Promise<MetSearchResult> {
  const url = new URL(`${BASE_URL}/search`);
  url.searchParams.set("q", query);
  if (hasImages) url.searchParams.set("hasImages", "true");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new MetApiError(`Met API search returned ${res.status} for query "${query}"`, res.status);
  }
  return res.json() as Promise<MetSearchResult>;
}
