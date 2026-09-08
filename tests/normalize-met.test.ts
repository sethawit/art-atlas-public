import { describe, expect, it } from "vitest";
import { normalizeMetObject } from "@/lib/ingest/normalize-met";
import type { MetObject } from "@/lib/met/client";
import fixture from "./fixtures/met-436535.json" with { type: "json" };

// fixture is a real, captured response from the live Met API (objectID 436535,
// "Wheat Field with Cypresses" by Van Gogh) — see tests/fixtures/met-436535.json.
const metObject = fixture as unknown as MetObject;

describe("normalizeMetObject", () => {
  it("maps a public-domain Met object into the core data model shape", () => {
    const result = normalizeMetObject(metObject);

    expect(result.slug).toBe("wheat-field-with-cypresses");
    expect(result.title).toBe("Wheat Field with Cypresses");
    expect(result.artist).toEqual({ slug: "vincent-van-gogh", name: "Vincent van Gogh" });
    expect(result.institution.slug).toBe("the-metropolitan-museum-of-art");
    expect(result.physicalObject).toEqual({
      accessionNumber: "1993.132",
      medium: "Oil on canvas",
      dimensions: "28 13/16 × 36 3/4 in. (73.2 × 93.4 cm)",
    });
    expect(result.sourceUrl).toBe("https://www.metmuseum.org/art/collection/search/436535");
  });

  it("renders an image when isPublicDomain is true and primaryImage is populated", () => {
    const result = normalizeMetObject(metObject);
    expect(result.image).not.toBeNull();
    expect(result.image?.sourceUrl).toBe(metObject.primaryImage);
    expect(result.image?.rightsUrl).toContain("open-access");
  });

  it("treats the image as unavailable when isPublicDomain is false, even if primaryImage is populated", () => {
    // Register gotcha: isPublicDomain and image-URL presence aren't reliably correlated.
    const nonPublicDomain: MetObject = { ...metObject, isPublicDomain: false };
    const result = normalizeMetObject(nonPublicDomain);
    expect(result.image).toBeNull();
  });

  it("treats the image as unavailable when primaryImage is empty, even if isPublicDomain is true", () => {
    const noImage: MetObject = { ...metObject, primaryImage: "" };
    const result = normalizeMetObject(noImage);
    expect(result.image).toBeNull();
  });

  it("marks a creation date as exact when begin and end years match", () => {
    const result = normalizeMetObject(metObject);
    const dateAssertion = result.assertions.find((a) => a.field === "creationDate");
    expect(dateAssertion?.precision).toBe("exact");
    expect(dateAssertion?.value).toBe("1889");
    expect(dateAssertion?.valueEarliest?.getUTCFullYear()).toBe(1889);
    expect(dateAssertion?.valueLatest?.getUTCFullYear()).toBe(1889);
  });

  it("marks a creation date as approximate when begin and end years differ", () => {
    const ranged: MetObject = { ...metObject, objectDate: "1888–1889", objectBeginDate: 1888, objectEndDate: 1889 };
    const result = normalizeMetObject(ranged);
    const dateAssertion = result.assertions.find((a) => a.field === "creationDate");
    expect(dateAssertion?.precision).toBe("approximate");
  });

  it("marks a creation date as disputed when the display text contains a question mark", () => {
    const disputed: MetObject = { ...metObject, objectDate: "1889?" };
    const result = normalizeMetObject(disputed);
    const dateAssertion = result.assertions.find((a) => a.field === "creationDate");
    expect(dateAssertion?.precision).toBe("disputed");
  });

  it("preserves original wording for subject tags and artist bio as separate assertions", () => {
    const result = normalizeMetObject(metObject);
    expect(result.assertions.find((a) => a.field === "subjectTags")?.value).toBe(
      "Landscapes, Cypresses, Summer"
    );
    expect(result.assertions.find((a) => a.field === "artistBio")?.value).toContain("Zundert");
  });

  it("records the object's canonical record URL as a sourceRecordUrl assertion", () => {
    const result = normalizeMetObject(metObject);
    expect(result.assertions.find((a) => a.field === "sourceRecordUrl")?.value).toBe(
      "https://www.metmuseum.org/art/collection/search/436535"
    );
  });

  it("has no artist when artistDisplayName is blank", () => {
    const anonymous: MetObject = { ...metObject, artistDisplayName: "" };
    const result = normalizeMetObject(anonymous);
    expect(result.artist).toBeNull();
  });
});
