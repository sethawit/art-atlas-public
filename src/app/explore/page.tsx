import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getFilterOptions, searchArtworks } from "@/lib/queries/search-artworks";
import { proxiedImageUrl } from "@/lib/images/proxied-image-url";
import { ArtFrame } from "@/components/ArtImage";

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

  const [{ results, total, page, pageSize }, filterOptions, suggestedArtists] = await Promise.all([
    hasAnyFilter ? searchArtworks(prisma, filters) : Promise.resolve({ results: [], total: 0, page: 1, pageSize: 24 }),
    getFilterOptions(prisma),
    prisma.artist.findMany({
      include: { _count: { select: { artworks: true } } },
      orderBy: { artworks: { _count: "desc" } },
      take: 5,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const artistSuggestions = (
    <ul className="tag-list">
      {suggestedArtists.map((a) => (
        <li key={a.id}>
          <Link href={`/artist/${a.slug}`}>
            {a.name} <span className="count">{a._count.artworks}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <main>
      <header className="page-head">
        <h1>Explore</h1>
      </header>

      <div className="explore">
        <form action="/explore" className="filters" aria-label="Search and filter">
          <div>
            <label htmlFor="q">Search by artwork, artist, or subject</label>
            <input id="q" name="q" type="search" defaultValue={params.q} />
          </div>

          <fieldset>
            <legend>Creation date range</legend>
            <div>
              <label htmlFor="dateFrom">From year</label>
              <input id="dateFrom" name="dateFrom" type="number" defaultValue={params.dateFrom} />
            </div>
            <div>
              <label htmlFor="dateTo">To year</label>
              <input id="dateTo" name="dateTo" type="number" defaultValue={params.dateTo} />
            </div>
          </fieldset>

          <div>
            <label htmlFor="medium">Medium</label>
            <select id="medium" name="medium" defaultValue={params.medium ?? ""}>
              <option value="">Any</option>
              {filterOptions.mediums.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="museum">Museum</label>
            <select id="museum" name="museum" defaultValue={params.museum ?? ""}>
              <option value="">Any</option>
              {filterOptions.institutions.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="city">City</label>
            <select id="city" name="city" defaultValue={params.city ?? ""}>
              <option value="">Any</option>
              {filterOptions.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="displayStatus">Display status</label>
            <select id="displayStatus" name="displayStatus" defaultValue={params.displayStatus ?? ""}>
              <option value="">Any</option>
              <option value="on_display">On display</option>
              <option value="not_on_display">Not on display</option>
              <option value="unconfirmed">Unconfirmed</option>
            </select>
          </div>

          <div>
            <label htmlFor="movement">Movement / style</label>
            <select id="movement" name="movement" defaultValue={params.movement ?? ""}>
              <option value="">Any</option>
              {filterOptions.movements.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filters__actions">
            <button type="submit">Search</button>
            {hasAnyFilter && <Link href="/explore">Clear all</Link>}
          </div>
        </form>

        <div>
          {!hasAnyFilter ? (
            <>
              <p className="lede">Enter a search term or pick a filter to browse the catalogue.</p>
              <p className="muted">Or start from an artist:</p>
              {artistSuggestions}
            </>
          ) : results.length === 0 ? (
            <>
              <p className="lede">
                No matches
                {params.q && <> for &ldquo;{params.q}&rdquo;</>}. Try removing a filter, or explore
                by artist instead:
              </p>
              {artistSuggestions}
            </>
          ) : (
            <>
              <form action="/compare">
                <div className="results-bar">
                  <p>
                    <strong>
                      {total} result{total === 1 ? "" : "s"}
                    </strong>
                    <span className="sep" />
                    <span className="muted">Select 2 to 4 works to compare side by side.</span>
                  </p>
                  <button type="submit" className="button-quiet">
                    Compare selected
                  </button>
                </div>
                <ul className="card-grid">
                  {results.map((artwork) => {
                    const image = artwork.physicalObjects.flatMap((po) => po.images)[0];
                    return (
                      <li key={artwork.id}>
                        <Link href={`/artwork/${artwork.slug}`}>
                          <ArtFrame src={proxiedImageUrl(image?.sourceUrl)} alt={image?.altText ?? artwork.title} />
                          <p>{artwork.title}</p>
                        </Link>
                        {artwork.artist && <p>{artwork.artist.name}</p>}
                        <label className="compare-check">
                          <input type="checkbox" name="slug" value={artwork.slug} /> Select to compare
                          <span className="visually-hidden"> {artwork.title}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <button type="submit">Compare selected</button>
              </form>

              <nav aria-label="Pagination" className="pagination">
                {page > 1 && <Link href={buildQueryString(params, { page: String(page - 1) })}>Previous</Link>}
                <span className="muted">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && <Link href={buildQueryString(params, { page: String(page + 1) })}>Next</Link>}
              </nav>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
