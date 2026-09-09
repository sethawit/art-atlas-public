// Static, real, publicly verifiable reference data for Phase 1's two institutions — not
// "sourced content" needing an Assertion/citation the way ingested object facts do (same
// category as normalize-met.ts's hardcoded Open Access policy URL): official visit pages
// and public geographic coordinates, stable facts about the institutions themselves.
// A slug not listed here (a future third institution) degrades gracefully — see callers.
export interface InstitutionReference {
  visitUrl: string;
  lat: number;
  lng: number;
}

export const INSTITUTION_REFERENCE: Record<string, InstitutionReference> = {
  "the-metropolitan-museum-of-art": {
    visitUrl: "https://www.metmuseum.org/visit",
    lat: 40.7794,
    lng: -73.9632,
  },
  "art-institute-of-chicago": {
    visitUrl: "https://www.artic.edu/visit",
    lat: 41.8796,
    lng: -87.6237,
  },
};
