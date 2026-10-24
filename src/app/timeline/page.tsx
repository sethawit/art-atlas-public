import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTimeline, getTimelineFilterOptions, type TimelineEntry } from "@/lib/queries/get-timeline";
import { ArtFrame } from "@/components/ArtImage";

// Ticket 13 — §3's Phase 1 allowance: "establish a useful initial timeline in Phase 1 if
// verified metadata makes it inexpensive." It is: this reads creationDate Assertions
// already ingested, no new source. Grouped by century, not decade — precise enough to be
// useful across a corpus spanning the 11th to 20th centuries without implying more
// granularity than a "useful initial" version needs.
//
// Ticket 24 (Phase 2, "interactive" per §3) adds real place/medium filters, URL-preserved
// like Explore's — a filtered view actually narrows the query, not a client-side effect.
// Each century leads with a handful of pictured works; the rest are a plain text index.
// Rendering every entry as an image card made this page close to 1 MB of HTML.
const PICTURED_PER_CENTURY = 10;

function EntryDate({ entry }: { entry: TimelineEntry }) {
  return (
    <>
      {entry.dateDisplay}
      {entry.precision === "approximate" && " (approximate)"}
      {entry.precision === "disputed" && " (disputed)"}
    </>
  );
}

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
      <header className="page-head">
        <h1>Timeline</h1>
        <p className="lede">
          {totalDated} artworks with a documented creation date, grouped by century. Not a
          claim that this represents art history broadly, only what&apos;s in our catalogue
          so far. Dates read as approximate or disputed are labeled, not smoothed over.
        </p>
      </header>

      <form action="/timeline" className="inline-filters" aria-label="Filter timeline">
        <div>
          <label htmlFor="place">Place / culture</label>
          <select id="place" name="place" defaultValue={place ?? ""}>
            <option value="">Any</option>
            {filterOptions.places.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="medium">Medium</label>
          <select id="medium" name="medium" defaultValue={medium ?? ""}>
            <option value="">Any</option>
            {filterOptions.mediums.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="filters__actions">
          <button type="submit">Filter</button>
          {hasFilter && <Link href="/timeline">Clear filters</Link>}
        </div>
      </form>

      {centuries.length === 0 ? (
        <p role="status">
          {hasFilter
            ? "No dated artworks match this filter combination."
            : "No dated artworks in the catalogue yet."}
        </p>
      ) : (
        centuries.map((century) => {
          const headingId = `century-${century.label.replace(/\s+/g, "-")}`;
          const pictured = century.entries.slice(0, PICTURED_PER_CENTURY);
          const rest = century.entries.slice(PICTURED_PER_CENTURY);
          return (
            <section key={century.label} aria-labelledby={headingId} className="century">
              <h2 id={headingId}>
                {century.label}
                <span className="count">
                  {century.entries.length} work{century.entries.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className="century__body">
                <ul className="card-grid card-grid--compact">
                  {pictured.map((entry) => (
                    <li key={entry.artworkId}>
                      <Link href={`/artwork/${entry.slug}`}>
                        <ArtFrame src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} />
                        <p>{entry.title}</p>
                      </Link>
                      {entry.artistName && <p>{entry.artistName}</p>}
                      <p>
                        <EntryDate entry={entry} />
                      </p>
                      {entry.placeOrCulture && <p>{entry.placeOrCulture}</p>}
                    </li>
                  ))}
                </ul>
                {rest.length > 0 && (
                  <details>
                    <summary>
                      {rest.length} more from the {century.label}
                    </summary>
                    <ul className="index-list">
                      {rest.map((entry) => (
                        <li key={entry.artworkId}>
                          <Link href={`/artwork/${entry.slug}`}>{entry.title}</Link>
                          {entry.artistName && (
                            <>
                              <span className="sep" />
                              {entry.artistName}
                            </>
                          )}
                          <span className="sep" />
                          <EntryDate entry={entry} />
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}
