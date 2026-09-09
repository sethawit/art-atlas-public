import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { searchArtworks } from "@/lib/queries/search-artworks";

// Minimal — title/artist search only, no filters yet. Full Explore page (date range,
// movement/style, medium, museum, city, display status, URL-preserved filters, no-result
// suggestions, pagination) is ticket 07; this route is where it will grow into.
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const results = q.trim() ? await searchArtworks(prisma, q) : [];

  return (
    <main>
      <h1>Explore</h1>
      <form action="/explore">
        <label htmlFor="q">Search by artwork or artist</label>
        <input id="q" name="q" type="search" defaultValue={q} />
        <button type="submit">Search</button>
      </form>

      {q.trim() === "" ? (
        <p>Enter a search term above.</p>
      ) : results.length === 0 ? (
        <p>
          No matches for &ldquo;{q}&rdquo;. Try an artist&apos;s name, or fewer words — this
          is a title/artist search only for now.
        </p>
      ) : (
        <ul>
          {results.map((artwork) => {
            const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
            return (
              <li key={artwork.id}>
                <Link href={`/artwork/${artwork.slug}`}>
                  {image && <img src={image.sourceUrl} alt={image.altText ?? artwork.title} width={120} />}
                  {artwork.title}
                  {artwork.artist && <> — {artwork.artist.name}</>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
