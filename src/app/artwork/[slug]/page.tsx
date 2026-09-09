import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getArtworkBySlug } from "@/lib/queries/get-artwork-by-slug";
import { getRelatedPieces } from "@/lib/queries/get-related-pieces";
import PassportControls from "@/components/PassportControls";

// Ticket 03 scope: Overview, Understand, and Sources. Ticket 09 adds Related pieces.
// Where to see it (ticket 10) and Journey (Phase 2, §5) extend this same page later —
// see docs/superpowers/specs/2026-09-08-art-atlas-product-definition-and-sitemap.md.

type RelatedView = "grid" | "comparison" | "map";

export default async function ArtworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ relatedView?: string }>;
}) {
  const { slug } = await params;
  const { relatedView: relatedViewParam } = await searchParams;
  const relatedView: RelatedView =
    relatedViewParam === "comparison" || relatedViewParam === "map" ? relatedViewParam : "grid";

  const data = await getArtworkBySlug(prisma, slug);
  if (!data) notFound();

  const { artwork, physicalObject, fields } = data;
  const image = physicalObject?.images[0] ?? null;
  const dateAssertion = fields.get("creationDate");
  const bioAssertion = fields.get("artistBio");
  const tagsAssertion = fields.get("subjectTags");
  const recordUrlAssertion = fields.get("sourceRecordUrl");
  const relatedPieces = await getRelatedPieces(prisma, artwork.id);

  // Map view: this work plus every related piece, grouped by holding institution.
  const mapEntries = [
    { institution: physicalObject?.institution, artwork, isThisWork: true },
    ...relatedPieces.map((rp) => ({
      institution: rp.artwork.physicalObjects[0]?.institution,
      artwork: rp.artwork,
      isThisWork: false,
    })),
  ];
  const mapInstitutions = Array.from(
    new Map(
      mapEntries.filter((e) => e.institution).map((e) => [e.institution!.slug, e.institution!] as const)
    ).values()
  );

  const passportSnapshot = {
    artworkSlug: artwork.slug,
    title: artwork.title,
    artistName: artwork.artist?.name ?? null,
    artistSlug: artwork.artist?.slug ?? null,
    imageUrl: image?.sourceUrl ?? null,
    imageAlt: image?.altText ?? artwork.title,
    institutionName: physicalObject?.institution?.name ?? null,
    institutionSlug: physicalObject?.institution?.slug ?? null,
    city: physicalObject?.institution?.city ?? null,
    styles: artwork.movements.map((am) => am.movement.name),
  };

  return (
    <main>
      <article>
        <header>
          <h1>{artwork.title}</h1>
          {artwork.artist && <p>{artwork.artist.name}</p>}
          {dateAssertion && (
            <p>
              {dateAssertion.value}
              {dateAssertion.precision === "approximate" && " (approximate)"}
              {dateAssertion.precision === "disputed" && " (disputed)"}
            </p>
          )}
        </header>

        {image ? (
          <figure>
            {/* Full artwork view, not a cropped preview — §12. */}
            <img src={image.sourceUrl} alt={image.altText ?? artwork.title} />
            {image.credit && <figcaption>{image.credit}</figcaption>}
          </figure>
        ) : (
          <p role="status">Image unavailable — this piece is not cleared for open-access display.</p>
        )}

        <PassportControls snapshot={passportSnapshot} />

        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading">Overview</h2>
          <dl>
            {physicalObject?.medium && (
              <>
                <dt>Medium</dt>
                <dd>{physicalObject.medium}</dd>
              </>
            )}
            {physicalObject?.dimensions && (
              <>
                <dt>Dimensions</dt>
                <dd>{physicalObject.dimensions}</dd>
              </>
            )}
            {physicalObject?.accessionNumber && (
              <>
                <dt>Accession number</dt>
                <dd>{physicalObject.accessionNumber}</dd>
              </>
            )}
            {physicalObject?.institution && (
              <>
                <dt>Institution</dt>
                <dd>{physicalObject.institution.name}</dd>
              </>
            )}
            <dt>Display status</dt>
            <dd>{(physicalObject?.displayStatus ?? "unconfirmed").replace(/_/g, " ")}</dd>
          </dl>
        </section>

        <section aria-labelledby="understand-heading">
          <h2 id="understand-heading">Understand</h2>
          {bioAssertion && <p>{bioAssertion.value}</p>}
          {tagsAssertion && (
            <p>
              <strong>Subject: </strong>
              {tagsAssertion.value}
            </p>
          )}
          {!bioAssertion && !tagsAssertion && <p>No interpretive notes yet for this piece.</p>}
        </section>

        <section aria-labelledby="related-heading">
          <h2 id="related-heading">Related pieces</h2>
          {relatedPieces.length === 0 ? (
            <p>No documented related pieces yet for this work.</p>
          ) : (
            <>
              <p>
                {relatedPieces.length} documented piece{relatedPieces.length === 1 ? "" : "s"} in our
                catalogue — coverage is partial, not a claim of completeness.
              </p>
              <nav aria-label="Related pieces view">
                <Link href={`/artwork/${slug}?relatedView=grid`} aria-current={relatedView === "grid" || undefined}>
                  Grid
                </Link>{" "}
                <Link
                  href={`/artwork/${slug}?relatedView=comparison`}
                  aria-current={relatedView === "comparison" || undefined}
                >
                  Comparison
                </Link>{" "}
                <Link href={`/artwork/${slug}?relatedView=map`} aria-current={relatedView === "map" || undefined}>
                  Map
                </Link>
              </nav>

              {relatedView === "grid" && (
                <ul>
                  {relatedPieces.map((rp) => {
                    const rpImage = rp.artwork.physicalObjects.flatMap((po) => po.images)[0];
                    const rpInstitution = rp.artwork.physicalObjects[0]?.institution;
                    const rpDisplayStatus = rp.artwork.physicalObjects[0]?.displayStatus ?? "unconfirmed";
                    return (
                      <li key={rp.relationship.id}>
                        <Link href={`/artwork/${rp.artwork.slug}`}>
                          {rpImage && (
                            <img src={rpImage.sourceUrl} alt={rpImage.altText ?? rp.artwork.title} width={160} />
                          )}
                          <p>{rp.artwork.title}</p>
                        </Link>
                        {rp.artwork.artist && <p>{rp.artwork.artist.name}</p>}
                        {rp.date && <p>{rp.date}</p>}
                        <p>
                          <strong>{rp.label}</strong> — {rp.explanation}
                        </p>
                        {rpInstitution && <p>{rpInstitution.name}</p>}
                        <p>Display status: {rpDisplayStatus.replace(/_/g, " ")}</p>
                        <p>
                          Source: <a href={rp.evidenceSource.url}>{rp.evidenceSource.name}</a>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}

              {relatedView === "comparison" && (
                <table>
                  <caption>Comparing {artwork.title} with its documented related pieces</caption>
                  <thead>
                    <tr>
                      <th scope="col">Image</th>
                      <th scope="col">Title</th>
                      <th scope="col">Artist</th>
                      <th scope="col">Date</th>
                      <th scope="col">Medium</th>
                      <th scope="col">Dimensions</th>
                      <th scope="col">Collection</th>
                      <th scope="col">Relationship</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{image && <img src={image.sourceUrl} alt={image.altText ?? artwork.title} width={100} />}</td>
                      <td>{artwork.title} (this work)</td>
                      <td>{artwork.artist?.name}</td>
                      <td>{dateAssertion?.value}</td>
                      <td>{physicalObject?.medium}</td>
                      <td>{physicalObject?.dimensions}</td>
                      <td>{physicalObject?.institution?.name}</td>
                      <td>—</td>
                    </tr>
                    {relatedPieces.slice(0, 3).map((rp) => {
                      const rpImage = rp.artwork.physicalObjects.flatMap((po) => po.images)[0];
                      const rpObject = rp.artwork.physicalObjects[0];
                      return (
                        <tr key={rp.relationship.id}>
                          <td>
                            {rpImage && (
                              <img src={rpImage.sourceUrl} alt={rpImage.altText ?? rp.artwork.title} width={100} />
                            )}
                          </td>
                          <td>
                            <Link href={`/artwork/${rp.artwork.slug}`}>{rp.artwork.title}</Link>
                          </td>
                          <td>{rp.artwork.artist?.name}</td>
                          <td>{rp.date}</td>
                          <td>{rpObject?.medium}</td>
                          <td>{rpObject?.dimensions}</td>
                          <td>{rpObject?.institution?.name}</td>
                          <td>{rp.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {relatedView === "comparison" && (
                <p>
                  Screen size doesn&apos;t reflect physical scale — see the Dimensions column for
                  documented measurements.
                </p>
              )}

              {relatedView === "map" && (
                <>
                  <p>Grouped by holding institution (an accessible list — a pinned map is on the roadmap).</p>
                  <ul>
                    {mapInstitutions.map((institution) => (
                      <li key={institution.id}>
                        <Link href={`/museum/${institution.slug}`}>{institution.name}</Link>
                        <ul>
                          {mapEntries
                            .filter((entry) => entry.institution?.slug === institution.slug)
                            .map((entry) => (
                              <li key={entry.artwork.id}>
                                {entry.isThisWork ? (
                                  <>{entry.artwork.title} (this work)</>
                                ) : (
                                  <Link href={`/artwork/${entry.artwork.slug}`}>{entry.artwork.title}</Link>
                                )}
                              </li>
                            ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading">Sources</h2>
          <ul>
            {Array.from(fields.values())
              .filter((a) => a.field !== "sourceRecordUrl")
              .map((a) => (
                <li key={a.id}>
                  <strong>{a.field}:</strong> {a.value} — {a.source.name}
                  {recordUrlAssertion && (
                    <>
                      {", "}
                      <a href={recordUrlAssertion.value} target="_blank" rel="noopener noreferrer">
                        original record
                      </a>
                    </>
                  )}
                  {" (retrieved "}
                  {a.retrievedAt.toISOString().slice(0, 10)}
                  {")"}
                </li>
              ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
