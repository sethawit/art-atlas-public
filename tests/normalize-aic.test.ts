import { describe, expect, it } from "vitest";
import { normalizeAicArtwork } from "@/lib/ingest/normalize-aic";
import type { AicArtwork } from "@/lib/aic/client";
import fixture from "./fixtures/aic-28560.json" with { type: "json" };

// fixture is a real, captured response from the live AIC API (id 28560, "The Bedroom" by
// Van Gogh) — see tests/fixtures/aic-28560.json.
const aicArtwork = fixture as unknown as AicArtwork;

describe("normalizeAicArtwork", () => {
  it("maps a public-domain AIC artwork into the core data model shape", () => {
    const result = normalizeAicArtwork(aicArtwork);

    expect(result.slug).toBe("the-bedroom");
    expect(result.title).toBe("The Bedroom");
    expect(result.artist).toEqual({ slug: "vincent-van-gogh", name: "Vincent van Gogh" });
    expect(result.institution.slug).toBe("art-institute-of-chicago");
    expect(result.physicalObject.medium).toBe("Oil on canvas");
    expect(result.physicalObject.accessionNumber).toBeNull();
    expect(result.sourceUrl).toBe("https://www.artic.edu/artworks/28560");
  });

  it("captures placeOrCulture from AIC's place_of_origin field", () => {
    const result = normalizeAicArtwork(aicArtwork);
    expect(result.placeOrCulture).toBe("Saint-Rémy-de-Provence");
  });

  it("has no placeOrCulture when place_of_origin is absent", () => {
    const noOrigin: AicArtwork = { ...aicArtwork, place_of_origin: null };
    const result = normalizeAicArtwork(noOrigin);
    expect(result.placeOrCulture).toBeNull();
  });

  it("renders an image when is_public_domain is true and image_id is populated", () => {
    const result = normalizeAicArtwork(aicArtwork);
    expect(result.image).not.toBeNull();
    expect(result.image?.sourceUrl).toBe(
      "https://www.artic.edu/iiif/2/6644829f-f292-c5c4-a73c-0356a6fdbf0d/full/843,/0/default.jpg"
    );
    expect(result.image?.rightsUrl).toContain("open-access");
  });

  it("treats the image as unavailable when is_public_domain is false, even with a populated image_id", () => {
    // Register gotcha: is_public_domain gates the image; image_id presence alone doesn't.
    const restricted: AicArtwork = { ...aicArtwork, is_public_domain: false };
    const result = normalizeAicArtwork(restricted);
    expect(result.image).toBeNull();
  });

  it("treats the image as unavailable when image_id is missing, even if is_public_domain is true", () => {
    const noImage: AicArtwork = { ...aicArtwork, image_id: null };
    const result = normalizeAicArtwork(noImage);
    expect(result.image).toBeNull();
  });

  it("marks a creation date as exact when date_start and date_end match", () => {
    const result = normalizeAicArtwork(aicArtwork);
    const dateAssertion = result.assertions.find((a) => a.field === "creationDate");
    expect(dateAssertion?.precision).toBe("exact");
    expect(dateAssertion?.value).toBe("1889");
  });

  it("marks a creation date as approximate when date_start and date_end differ", () => {
    const ranged: AicArtwork = { ...aicArtwork, date_display: "1888/1889", date_start: 1888, date_end: 1889 };
    const result = normalizeAicArtwork(ranged);
    const dateAssertion = result.assertions.find((a) => a.field === "creationDate");
    expect(dateAssertion?.precision).toBe("approximate");
  });

  it("dedupes repeated term_titles for the subjectTags assertion", () => {
    const result = normalizeAicArtwork(aicArtwork);
    const tags = result.assertions.find((a) => a.field === "subjectTags")?.value ?? "";
    // "painting" appears 4 times and "paint" twice in the raw fixture — each should
    // appear once in the normalized value.
    expect(tags.split(", ").filter((t) => t === "painting")).toHaveLength(1);
  });

  it("records style_title as its own assertion", () => {
    const result = normalizeAicArtwork(aicArtwork);
    expect(result.assertions.find((a) => a.field === "styleTitle")?.value).toBe("Post-Impressionism");
  });

  it("records the artwork's canonical page URL as a sourceRecordUrl assertion", () => {
    const result = normalizeAicArtwork(aicArtwork);
    expect(result.assertions.find((a) => a.field === "sourceRecordUrl")?.value).toBe(
      "https://www.artic.edu/artworks/28560"
    );
  });

  it("falls back to artist_display when artist_title is absent", () => {
    const noArtistTitle: AicArtwork = { ...aicArtwork, artist_title: null };
    const result = normalizeAicArtwork(noArtistTitle);
    expect(result.artist?.name).toBe("Vincent van Gogh (Dutch, 1853–1890)");
  });
});
