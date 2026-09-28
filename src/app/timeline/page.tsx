import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTimeline, getTimelineFilterOptions } from "@/lib/queries/get-timeline";
import ArtworkImage from "@/components/ArtworkImage";

// Ticket 13 — §3's Phase 1 allowance: "establish a useful initial timeline in Phase 1 if
// verified metadata makes it inexpensive." It is: this reads creationDate Assertions
// already ingested, no new source. Grouped by century, not decade — precise enough to be
// useful across a corpus spanning the 11th to 20th centuries without implying more
// granularity than a "useful initial" version needs.
//
// Ticket 24 (Phase 2, "interactive" per §3) adds real place/medium filters, URL-preserved
// like Explore's — a filtered view actually narrows the query, not a client-side effect.
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; medium?: string }>;
}) {
  const { place, medium } = await searchParams;
  const [centuries, filterOptions] = await Promise.all([
    getTimeline(prisma, { placeOrCulture: place, medium }),
    getTimelineFilterOptions(prisma),
  ]);
  const totalDated = centuries.reduce((sum, c) => sum + (c.centuryStart !== null ? c.entries.length : 0), 0);
  const hasFilter = Boolean(place || medium);

  return (
    <main>
      <h1>Timeline</h1>
      <p>
        {totalDated} artworks with a documented creation date, grouped by century — not a
        claim that this represents art history broadly, only what&apos;s in our catalogue
        so far. Dates read as approximate or disputed are labeled, not smoothed over.
      </p>

      <form action="/timeline">
        <label htmlFor="place">Place / culture</label>
        <select id="place" name="place" defaultValue={place ?? ""}>
          <option value="">Any</option>
          {filterOptions.places.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label htmlFor="medium">Medium</label>
        <select id="medium" name="medium" defaultValue={medium ?? ""}>
          <option value="">Any</option>
          {filterOptions.mediums.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button type="submit">Filter</button>
        {hasFilter && <Link href="/timeline">Clear filters</Link>}
      </form>

      {centuries.length === 0 ? (
        <p role="status">
          {hasFilter
            ? "No dated artworks match this filter combination."
            : "No dated artworks in the catalogue yet."}
        </p>
      ) : (
        centuries.map((century) => (
          <section key={century.label} aria-labelledby={`century-${century.label.replace(/\s+/g, "-")}`}>
            <h2 id={`century-${century.label.replace(/\s+/g, "-")}`}>
              {century.label} ({century.entries.length})
            </h2>
            <ul className="card-grid">
              {century.entries.map((entry) => (
                <li key={entry.artworkId}>
                  <Link href={`/artwork/${entry.slug}`}>
                    {entry.imageUrl && <ArtworkImage src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} width={120} loading="lazy" />}
                    {entry.title}
                  </Link>
                  {entry.artistName && <> — {entry.artistName}</>}
                  {" — "}
                  {entry.dateDisplay}
                  {entry.precision === "approximate" && " (approximate)"}
                  {entry.precision === "disputed" && " (disputed)"}
                  {entry.placeOrCulture && <> — {entry.placeOrCulture}</>}
                  {entry.medium && <> — {entry.medium}</>}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
