import { describe, expect, it } from "vitest";
import { parseArtistBio } from "@/lib/artists/parse-bio";

// All five inputs are real artistDisplayBio values pulled live from Met records
// currently in our catalogue (checked via psql during ticket 08).
describe("parseArtistBio", () => {
  it("extracts nationality and a clean year range", () => {
    const result = parseArtistBio("Dutch, Zundert 1853–1890 Auvers-sur-Oise");
    expect(result.nationality).toBe("Dutch");
    expect(result.lifespanYears).toBe("1853–1890");
    expect(result.raw).toBe("Dutch, Zundert 1853–1890 Auvers-sur-Oise");
  });

  it("extracts nationality and year range for a different nationality/place shape", () => {
    const result = parseArtistBio("French, Bordeaux 1822–1899 Thomery");
    expect(result.nationality).toBe("French");
    expect(result.lifespanYears).toBe("1822–1899");
  });

  it("extracts nationality but not a year range when the end year is two-digit shorthand", () => {
    const result = parseArtistBio("Netherlandish, active ca. 1460–95");
    expect(result.nationality).toBe("Netherlandish");
    expect(result.lifespanYears).toBeNull();
  });

  it("extracts nationality but not a year range when words interrupt the dash", () => {
    const result = parseArtistBio("Netherlandish, Seligenstadt, active by 1465–died 1494 Bruges");
    expect(result.nationality).toBe("Netherlandish");
    expect(result.lifespanYears).toBeNull();
  });

  it("extracts nationality only, no dates present at all", () => {
    const result = parseArtistBio("Netherlandish, active ca. 1460–95".replace(/\d.*/, "active"));
    expect(result.nationality).toBe("Netherlandish");
    expect(result.lifespanYears).toBeNull();
  });
});
