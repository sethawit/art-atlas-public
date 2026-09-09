import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getFilterOptions, searchArtworks } from "@/lib/queries/search-artworks";

// Ticket 07 — six real, combinable filters (date range, medium, museum, city, display
// status, movement/style — the last added ticket 17) plus text search with basic
// spelling tolerance, URL-preserved, paginated.

interface ExploreSearchParams {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  medium?: string;
  museum?: string;
  city?: string;
  displayStatus?: string;
  movement?: string;
  page?: string;
}

function buildQueryString(params: ExploreSearchParams, overrides: Partial<ExploreSearchParams>) {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) search.set(key, value);
  }
  return `/explore?${search.toString()}`;
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<ExploreSearchParams> }) {
  const params = await searchParams;
  const filters = {
    q: params.q,
    dateFrom: params.dateFrom ? Number(params.dateFrom) : undefined,
    dateTo: params.dateTo ? Number(params.dateTo) : undefined,
    medium: params.medium,
    museumSlug: params.museum,
    city: params.city,
    displayStatus: params.displayStatus,
    movementSlug: params.movement,
    page: params.page ? Number(params.page) : 1,
  };
  const hasAnyFilter = Object.values(params).some(Boolean);

  const [{ results, total, page, pageSize }, filterOptions] = await Promise.all([
    hasAnyFilter ? searchArtworks(prisma, filters) : Promise.resolve({ results: [], total: 0, page: 1, pageSize: 24 }),
    getFilterOptions(prisma),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const suggestedArtists = await prisma.artist.findMany({
    include: { _count: { select: { artworks: true } } },
    orderBy: { artworks: { _count: "desc" } },
    take: 5,
  });

  return (
    <main>
      <h1>Explore</h1>

      <form action="/explore">
        <label htmlFor="q">Search by artwork or artist</label>
        <input id="q" name="q" type="search" defaultValue={params.q} />

        <fieldset>
          <legend>Creation date range</legend>
          <label htmlFor="dateFrom">From year</label>
          <input id="dateFrom" name="dateFrom" type="number" defaultValue={params.dateFrom} />
          <label htmlFor="dateTo">To year</label>
          <input id="dateTo" name="dateTo" type="number" defaultValue={params.dateTo} />
        </fieldset>

        <label htmlFor="medium">Medium</label>
        <select id="medium" name="medium" defaultValue={params.medium ?? ""}>
          <option value="">Any</option>
          {filterOptions.mediums.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <label htmlFor="museum">Museum</label>
        <select id="museum" name="museum" defaultValue={params.museum ?? ""}>
          <option value="">Any</option>
          {filterOptions.institutions.map((i) => (
            <option key={i.slug} value={i.slug}>
              {i.name}
            </option>
          ))}
        </select>

        <label htmlFor="city">City</label>
        <select id="city" name="city" defaultValue={params.city ?? ""}>
          <option value="">Any</option>
          {filterOptions.cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label htmlFor="displayStatus">Display status</label>
        <select id="displayStatus" name="displayStatus" defaultValue={params.displayStatus ?? ""}>
          <option value="">Any</option>
          <option value="on_display">On display</option>
          <option value="not_on_display">Not on display</option>
          <option value="unconfirmed">Unconfirmed</option>
        </select>

        <label htmlFor="movement">Movement / style</label>
        <select id="movement" name="movement" defaultValue={params.movement ?? ""}>
          <option value="">Any</option>
          {filterOptions.movements.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>

        <button type="submit">Search</button>
      </form>

      {!hasAnyFilter ? (
        <p>Enter a search term or pick a filter above.</p>
      ) : results.length === 0 ? (
        <>
          <p>
            No matches
            {params.q && <> for &ldquo;{params.q}&rdquo;</>}. Try removing a filter, or explore
            by artist instead:
          </p>
          <ul>
            {suggestedArtists.map((a) => (
              <li key={a.id}>
                <Link href={`/artist/${a.slug}`}>
                  {a.name} ({a._count.artworks})
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p>
            {total} result{total === 1 ? "" : "s"}
          </p>
          <form action="/compare">
            <p>Select 2–4 works to compare side by side.</p>
            <ul>
              {results.map((artwork) => {
                const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
                return (
                  <li key={artwork.id}>
                    <label>
                      <input type="checkbox" name="slug" value={artwork.slug} />
                      <Link href={`/artwork/${artwork.slug}`}>
                        {image && <img src={image.sourceUrl} alt={image.altText ?? artwork.title} width={120} />}
                        {artwork.title}
                        {artwork.artist && <> — {artwork.artist.name}</>}
                      </Link>
                    </label>
                  </li>
                );
              })}
            </ul>
            <button type="submit">Compare selected</button>
          </form>

          <nav aria-label="Pagination">
            {page > 1 && <Link href={buildQueryString(params, { page: String(page - 1) })}>Previous</Link>}
            <span>
              {" "}
              Page {page} of {totalPages}{" "}
            </span>
            {page < totalPages && <Link href={buildQueryString(params, { page: String(page + 1) })}>Next</Link>}
          </nav>
        </>
      )}
    </main>
  );
}
