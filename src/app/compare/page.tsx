import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getArtworksForComparison, getPairwiseComparisonInsights } from "@/lib/queries/get-artworks-for-comparison";

// §5 "Compare and understand" (ticket 22) — a general-purpose compare tool, unlike the
// artwork page's comparison view which only shows an artwork's own verified related
// pieces. Reads 2-4 slugs from the URL (?slug=a&slug=b...) so it's linkable/shareable —
// no client-side selection state to keep in sync with the server.

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string | string[] }>;
}) {
  const { slug } = await searchParams;
  const slugs = slug ? (Array.isArray(slug) ? slug : [slug]) : [];
  const entries = slugs.length > 0 ? await getArtworksForComparison(prisma, slugs) : [];
  const skippedCount = slugs.length - entries.length;
  const insights = entries.length >= 2 ? await getPairwiseComparisonInsights(prisma, entries) : [];

  return (
    <main>
      <h1>Compare and understand</h1>
      <p>
        Compare 2–4 works side by side — images, dates, materials, dimensions, and
        collections. Screen size doesn&apos;t reflect physical scale; see the Dimensions
        row for documented measurements.
      </p>

      <form action="/compare">
        <label htmlFor="add-slug">Add a work by its Art Atlas URL slug</label>
        <input id="add-slug" type="text" placeholder="e.g. wheat-field-with-cypresses" name="slug" />
        {slugs.map((s) => (
          <input key={s} type="hidden" name="slug" value={s} />
        ))}
        <button type="submit" disabled={slugs.length >= 4}>
          Add to comparison
        </button>
        {slugs.length >= 4 && <p>Comparison is full — 4 works maximum.</p>}
      </form>

      {entries.length === 0 ? (
        <p>
          No works selected yet. Add a slug above, or start a comparison from an
          artwork&apos;s Related pieces or a search result on{" "}
          <Link href="/explore">Explore</Link>.
        </p>
      ) : (
        <>
          {skippedCount > 0 && (
            <p role="status">
              {skippedCount} selected slug{skippedCount === 1 ? "" : "s"} didn&apos;t match a
              real artwork and {skippedCount === 1 ? "was" : "were"} skipped.
            </p>
          )}
          {entries.length === 1 && <p>Add at least one more work to compare.</p>}

          <table className="comparison-table">
            <caption>Comparing {entries.map((e) => e.title).join(", ")}</caption>
            <thead>
              <tr>
                <th scope="col">Image</th>
                <th scope="col">Title</th>
                <th scope="col">Artist</th>
                <th scope="col">Date</th>
                <th scope="col">Medium</th>
                <th scope="col">Dimensions</th>
                <th scope="col">Collection</th>
                <th scope="col">Remove</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.slug}>
                  <td data-label="Image">
                    {entry.imageUrl && <img src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} width={120} loading="lazy" />}
                  </td>
                  <td data-label="Title">
                    <Link href={`/artwork/${entry.slug}`}>{entry.title}</Link>
                  </td>
                  <td data-label="Artist">
                    {entry.artistSlug ? <Link href={`/artist/${entry.artistSlug}`}>{entry.artistName}</Link> : "Unknown"}
                  </td>
                  <td data-label="Date">{entry.dateDisplay ?? "Undated in our records"}</td>
                  <td data-label="Medium">{entry.medium ?? "Not recorded"}</td>
                  <td data-label="Dimensions">{entry.dimensions ?? "Not recorded"}</td>
                  <td data-label="Collection">
                    {entry.institutionSlug ? (
                      <Link href={`/museum/${entry.institutionSlug}`}>{entry.institutionName}</Link>
                    ) : (
                      "Not recorded"
                    )}
                  </td>
                  <td data-label="Remove">
                    <Link href={`/compare?${slugs.filter((s) => s !== entry.slug).map((s) => `slug=${s}`).join("&")}`}>
                      Remove
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {insights.length > 0 && (
            <section aria-labelledby="insights-heading">
              <h2 id="insights-heading">How these works relate and differ</h2>
              <ul>
                {insights.map((insight) => {
                  const titleA = entries.find((e) => e.slug === insight.slugA)?.title ?? insight.slugA;
                  const titleB = entries.find((e) => e.slug === insight.slugB)?.title ?? insight.slugB;
                  return (
                    <li key={`${insight.slugA}-${insight.slugB}`}>
                      <p>
                        <strong>
                          {titleA} & {titleB}
                        </strong>
                      </p>
                      {insight.relationshipLabel ? (
                        <p>
                          Documented relationship: <strong>{insight.relationshipLabel}</strong>
                        </p>
                      ) : (
                        <p>No documented relationship between these two in our catalogue.</p>
                      )}
                      {insight.differences.length > 0 ? (
                        <ul>
                          {insight.differences.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No differences found in the fields we have for both.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
