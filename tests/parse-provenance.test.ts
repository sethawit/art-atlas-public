import { describe, expect, it } from "vitest";
import { splitProvenanceSegments, splitExhibitionSegments } from "@/lib/provenance/parse-provenance";

describe("splitProvenanceSegments", () => {
  it("splits a simple chain into one segment per transfer", () => {
    const text = "Kate Sturges Buckingham (1858–1937), Chicago; given to the Art Institute of Chicago, Dec. 12, 1929.";
    const segments = splitProvenanceSegments(text);
    expect(segments).toEqual([
      "Kate Sturges Buckingham (1858–1937), Chicago",
      "given to the Art Institute of Chicago, Dec. 12, 1929.",
    ]);
  });

  it("does not split on a semicolon inside a bracketed citation aside", () => {
    // Real text, pulled live from api.artic.edu/api/v1/artworks/87088 — this exact
    // sentence has no semicolon inside its bracket, but nested parens inside the bracket
    // must not themselves break bracket-depth tracking.
    const text =
      "Prince de Wagram, 1904. Léonce Rosenberg, Paris, by July 22, 1914 [this and the two following per Durand-Ruel, Paris, stock book for 1913–21 (no. 10710, as Le bassin aux nymphéas, 1900), as confirmed by Paul-Louis Durand-Ruel]; sold to Durand-Ruel, Paris, July 22, 1914, for 21,000 francs.";
    const segments = splitProvenanceSegments(text);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toContain("stock book for 1913–21 (no. 10710, as Le bassin aux nymphéas, 1900)");
    expect(segments[1]).toBe("sold to Durand-Ruel, Paris, July 22, 1914, for 21,000 francs.");
  });

  it("handles a real multi-owner chain with parenthetical death dates", () => {
    const text =
      "The artist (d. 1926); sold to Isidore Montaignac, Paris, as the agent for Knoedler and Company, New York, September 1891; sold to Potter Palmer (d. 1902), Chicago, September 1891; by descent to the Potter Family; given to the Art Institute of Chicago, 1922.";
    const segments = splitProvenanceSegments(text);
    expect(segments).toHaveLength(5);
    expect(segments[0]).toBe("The artist (d. 1926)");
    expect(segments[1]).toContain("as the agent for Knoedler and Company");
    expect(segments[4]).toBe("given to the Art Institute of Chicago, 1922.");
  });

  it("returns an empty array for empty input", () => {
    expect(splitProvenanceSegments("")).toEqual([]);
  });

  it("returns one segment for text with no semicolons", () => {
    expect(splitProvenanceSegments("Given by the artist's estate.")).toEqual(["Given by the artist's estate."]);
  });
});

describe("splitExhibitionSegments", () => {
  it("splits real blank-line-separated exhibition entries", () => {
    // Real text, pulled live from api.artic.edu/api/v1/artworks/27992.
    const text =
      "Paris, Maison Dorée, 1, rue Laffitte, VIIIème Exposition de peinture, May 15–June 15, 1886, cat. 175.\n\nParis, Rue des Tuileries, IIème Exposition de la Société des Artistes Indépendants, August 21–September 21, 1886, cat. 353.";
    const segments = splitExhibitionSegments(text);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toContain("Maison Dorée");
    expect(segments[1]).toContain("Rue des Tuileries");
  });

  it("returns an empty array for empty input", () => {
    expect(splitExhibitionSegments("")).toEqual([]);
  });
});
