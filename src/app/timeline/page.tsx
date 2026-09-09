import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTimeline } from "@/lib/queries/get-timeline";

// Ticket 13 — §3's Phase 1 allowance: "establish a useful initial timeline in Phase 1 if
// verified metadata makes it inexpensive." It is: this reads creationDate Assertions
// already ingested, no new source. Grouped by century, not decade — precise enough to be
// useful across a corpus spanning the 11th to 20th centuries without implying more
// granularity than a "useful initial" version needs.
export default async function TimelinePage() {
  const centuries = await getTimeline(prisma);
  const totalDated = centuries.reduce((sum, c) => sum + (c.centuryStart !== null ? c.entries.length : 0), 0);

  return (
    <main>
      <h1>Timeline</h1>
      <p>
        {totalDated} artworks with a documented creation date, grouped by century — not a
        claim that this represents art history broadly, only what&apos;s in our catalogue
        so far. Dates read as approximate or disputed are labeled, not smoothed over.
      </p>

      {centuries.length === 0 ? (
        <p role="status">No dated artworks in the catalogue yet.</p>
      ) : (
        centuries.map((century) => (
          <section key={century.label} aria-labelledby={`century-${century.label.replace(/\s+/g, "-")}`}>
            <h2 id={`century-${century.label.replace(/\s+/g, "-")}`}>
              {century.label} ({century.entries.length})
            </h2>
            <ul>
              {century.entries.map((entry) => (
                <li key={entry.artworkId}>
                  <Link href={`/artwork/${entry.slug}`}>
                    {entry.imageUrl && <img src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} width={120} />}
                    {entry.title}
                  </Link>
                  {entry.artistName && <> — {entry.artistName}</>}
                  {" — "}
                  {entry.dateDisplay}
                  {entry.precision === "approximate" && " (approximate)"}
                  {entry.precision === "disputed" && " (disputed)"}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
