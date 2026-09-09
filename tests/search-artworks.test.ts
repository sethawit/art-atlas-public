import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { newRunId } from "./helpers/run-id";
import { prisma } from "@/lib/prisma";
import { searchArtworks } from "@/lib/queries/search-artworks";

const runId = newRunId();

afterAll(async () => {
  // The shared test DB isn't transactional per-test-file — clean up this run's own rows
  // so repeated runs don't accumulate garbage the way earlier test files in this suite
  // already have (see the filtered assertion in "filters by creation date range" below).
  const artworks = await prisma.artwork.findMany({ where: { slug: { endsWith: runId } } });
  const artworkIds = artworks.map((a) => a.id);
  await prisma.duplicateFlag.deleteMany({
    where: { OR: [{ artworkAId: { in: artworkIds } }, { artworkBId: { in: artworkIds } }] },
  });
  await prisma.relationship.deleteMany({
    where: { OR: [{ subjectArtworkId: { in: artworkIds } }, { objectArtworkId: { in: artworkIds } }] },
  });
  await prisma.assertion.deleteMany({ where: { subjectId: { in: artworkIds } } });
  await prisma.imageAsset.deleteMany({ where: { physicalObject: { artworkId: { in: artworkIds } } } });
  await prisma.physicalObject.deleteMany({ where: { artworkId: { in: artworkIds } } });
  await prisma.artwork.deleteMany({ where: { id: { in: artworkIds } } });
  await prisma.institution.deleteMany({ where: { slug: { endsWith: runId } } });
  await prisma.artist.deleteMany({ where: { slug: { endsWith: runId } } });
  await prisma.source.deleteMany({ where: { name: { endsWith: runId } } });
  await prisma.$disconnect();
});

async function seedSource() {
  return prisma.source.create({ data: { name: `Test Source ${runId}`, url: "https://example.org" } });
}

async function seedArtwork(opts: {
  slug: string;
  title: string;
  artistName: string;
  institutionSlug: string;
  institutionCity: string;
  medium: string;
  displayStatus?: string;
  year: number;
  sourceId: string;
}) {
  const artist = await prisma.artist.upsert({
    where: { slug: `${opts.artistName.toLowerCase().replace(/\s+/g, "-")}-${runId}` },
    update: {},
    create: { slug: `${opts.artistName.toLowerCase().replace(/\s+/g, "-")}-${runId}`, name: opts.artistName },
  });
  const institution = await prisma.institution.upsert({
    where: { slug: opts.institutionSlug },
    update: {},
    create: { slug: opts.institutionSlug, name: opts.institutionSlug, city: opts.institutionCity },
  });
  const artwork = await prisma.artwork.create({
    data: { slug: `${opts.slug}-${runId}`, title: opts.title, artistId: artist.id },
  });
  await prisma.physicalObject.create({
    data: {
      artworkId: artwork.id,
      institutionId: institution.id,
      medium: opts.medium,
      displayStatus: opts.displayStatus ?? "unconfirmed",
      externalRecordUrl: `https://example.org/${opts.slug}-${runId}`,
    },
  });
  await prisma.assertion.create({
    data: {
      subjectType: "Artwork",
      subjectId: artwork.id,
      field: "creationDate",
      value: String(opts.year),
      valueEarliest: new Date(Date.UTC(opts.year, 0, 1)),
      valueLatest: new Date(Date.UTC(opts.year, 11, 31)),
      precision: "exact",
      sourceId: opts.sourceId,
      retrievedAt: new Date(),
      isPreferred: true,
    },
  });
  return artwork;
}

let sourceId: string;

beforeAll(async () => {
  const source = await seedSource();
  sourceId = source.id;

  await seedArtwork({
    slug: "sunrise",
    title: `Sunrise ${runId}`,
    artistName: `Test Painter A ${runId}`,
    institutionSlug: `gallery-a-${runId}`,
    institutionCity: `Cityville-${runId}`,
    medium: "Oil on canvas",
    year: 1880,
    sourceId,
  });
  await seedArtwork({
    slug: "sunset",
    title: `Sunset ${runId}`,
    artistName: `Test Painter A ${runId}`,
    institutionSlug: `gallery-a-${runId}`,
    institutionCity: `Cityville-${runId}`,
    medium: "Watercolor",
    year: 1900,
    displayStatus: "on_display",
    sourceId,
  });
  await seedArtwork({
    slug: "moonrise",
    title: `Moonrise ${runId}`,
    artistName: `Test Painter B ${runId}`,
    institutionSlug: `gallery-b-${runId}`,
    institutionCity: `Townburg-${runId}`,
    medium: "Oil on canvas",
    year: 1950,
    sourceId,
  });
});

describe("searchArtworks — filters", () => {
  it("filters by medium", async () => {
    const { results } = await searchArtworks(prisma, { medium: `Watercolor` });
    expect(results.some((a) => a.title === `Sunset ${runId}`)).toBe(true);
    expect(results.some((a) => a.title === `Sunrise ${runId}`)).toBe(false);
  });

  it("filters by museum slug", async () => {
    const { results } = await searchArtworks(prisma, { museumSlug: `gallery-b-${runId}` });
    expect(results.map((a) => a.title)).toEqual([`Moonrise ${runId}`]);
  });

  it("filters by city", async () => {
    const { results } = await searchArtworks(prisma, { city: `Cityville-${runId}` });
    expect(results.map((a) => a.title).sort()).toEqual([`Sunrise ${runId}`, `Sunset ${runId}`].sort());
  });

  it("filters by display status", async () => {
    const { results } = await searchArtworks(prisma, { displayStatus: "on_display" });
    expect(results.some((a) => a.title === `Sunset ${runId}`)).toBe(true);
    expect(results.every((a) => a.title !== `Sunrise ${runId}`)).toBe(true);
  });

  it("filters by creation date range", async () => {
    // Filtered to this run's own titles: the shared test DB isn't wiped between runs, so
    // a broad date range can legitimately also match leftover rows from earlier runs.
    const { results } = await searchArtworks(prisma, { dateFrom: 1890, dateTo: 1920 });
    const thisRun = results.filter((a) => a.title.includes(runId));
    expect(thisRun.map((a) => a.title)).toEqual([`Sunset ${runId}`]);
  });

  it("combines multiple filters with AND", async () => {
    const { results } = await searchArtworks(prisma, {
      city: `Cityville-${runId}`,
      medium: "Oil on canvas",
    });
    expect(results.map((a) => a.title)).toEqual([`Sunrise ${runId}`]);
  });

  it("finds exact substring matches on title", async () => {
    const { results } = await searchArtworks(prisma, { q: `Sunrise ${runId}` });
    expect(results.map((a) => a.title)).toEqual([`Sunrise ${runId}`]);
  });

  it("finds matches on artist name", async () => {
    const { results } = await searchArtworks(prisma, { q: `Test Painter B ${runId}` });
    expect(results.map((a) => a.title)).toEqual([`Moonrise ${runId}`]);
  });

  it("falls back to trigram similarity for a near-miss spelling", async () => {
    // "Sunrize" (typo) should still surface "Sunrise" via the trigram fallback since a
    // plain substring match finds nothing.
    const { results } = await searchArtworks(prisma, { q: `Sunrize ${runId}` });
    expect(results.some((a) => a.title === `Sunrise ${runId}`)).toBe(true);
  });

  it("returns zero results for a query with no plausible match, not an error", async () => {
    // Deliberately doesn't embed runId — a query containing this run's own random tag
    // would share real trigram overlap with this run's own fixture titles (found live:
    // making runId longer, for collision-resistance, pushed word_similarity's fuzzy
    // fallback over threshold against "Sunset <runId>"), which isn't what "no plausible
    // match at all" is supposed to test.
    const { results, total } = await searchArtworks(prisma, { q: "zzzznonexistentqueryxyzzzzz" });
    expect(results).toEqual([]);
    expect(total).toBe(0);
  });

  it("returns zero results when filters combine to an impossible set", async () => {
    const { results } = await searchArtworks(prisma, {
      city: `Cityville-${runId}`,
      museumSlug: `gallery-b-${runId}`, // gallery-b is in Townburg, not Cityville
    });
    expect(results).toEqual([]);
  });

  it("paginates results", async () => {
    const pageOne = await searchArtworks(prisma, { city: `Cityville-${runId}` });
    expect(pageOne.total).toBe(2);
    expect(pageOne.results).toHaveLength(2);
  });
});
