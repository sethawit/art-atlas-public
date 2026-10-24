import { describe, expect, it } from "vitest";
import { normalizeClevelandArtwork, parseClevelandCreator } from "@/lib/ingest/normalize-cleveland";
import type { ClevelandArtwork } from "@/lib/cleveland/client";
import fixture from "./fixtures/cleveland-135382.json" with { type: "json" };

// fixture is a real, captured response from the live Cleveland Open Access API (id
// 135382, "The Red Kerchief" by Monet) — see tests/fixtures/cleveland-135382.json.
const clevelandArtwork = fixture as unknown as ClevelandArtwork;

describe("normalizeClevelandArtwork", () => {
  it("maps a CC0 Cleveland artwork into the core data model shape", () => {
    const result = normalizeClevelandArtwork(clevelandArtwork);

    expect(result.slug).toBe("the-red-kerchief");
    expect(result.title).toBe("The Red Kerchief");
    expect(result.artist).toEqual({ slug: "claude-monet", name: "Claude Monet" });
    expect(result.institution).toEqual({
      slug: "cleveland-museum-of-art",
      name: "The Cleveland Museum of Art",
      city: "Cleveland",
    });
    expect(result.physicalObject).toEqual({
      accessionNumber: "1958.39",
      medium: "oil on fabric",
      dimensions: expect.stringContaining("99 x 79.8 cm"),
    });
    expect(result.placeOrCulture).toBe("France, 19th century");
    expect(result.sourceUrl).toBe("https://clevelandart.org/art/1958.39");
    expect(result.galleryLocation).toBe("222 Impressionism & Post-Impressionism");
  });

  it("uses the web rendition, not the multi-megabyte print one, as the image", () => {
    const result = normalizeClevelandArtwork(clevelandArtwork);
    expect(result.image?.sourceUrl).toBe("https://openaccess-cdn.clevelandart.org/1958.39/1958.39_web.jpg");
    expect(result.image?.rightsUrl).toContain("open-access");
  });

  it("treats the image as unavailable when the record is not CC0, even with images present", () => {
    const result = normalizeClevelandArtwork({ ...clevelandArtwork, share_license_status: "Copyrighted" });
    expect(result.image).toBeNull();
  });

  it("records the creation date range as approximate for a circa date", () => {
    const date = normalizeClevelandArtwork(clevelandArtwork).assertions.find((a) => a.field === "creationDate");
    expect(date).toMatchObject({ value: "c. 1868–73", precision: "approximate" });
    expect(date?.valueEarliest?.getUTCFullYear()).toBe(1868);
    expect(date?.valueLatest?.getUTCFullYear()).toBe(1873);
  });

  it("records the artist bio Cleveland embeds in the creator description", () => {
    const bio = normalizeClevelandArtwork(clevelandArtwork).assertions.find((a) => a.field === "artistBio");
    expect(bio?.value).toBe("French, 1840–1926");
  });

  it("has no artist when the record lists no creators", () => {
    const result = normalizeClevelandArtwork({ ...clevelandArtwork, creators: [] });
    expect(result.artist).toBeNull();
    expect(result.image?.altText).toBe("The Red Kerchief, artist unknown");
  });

  it("has no gallery location when the work is not on view", () => {
    expect(normalizeClevelandArtwork({ ...clevelandArtwork, current_location: null }).galleryLocation).toBeNull();
  });
});

describe("parseClevelandCreator", () => {
  it("keeps the whole description as the name when there is no parenthesised bio", () => {
    expect(parseClevelandCreator("Unknown maker")).toEqual({ name: "Unknown maker", bio: null });
  });
});
