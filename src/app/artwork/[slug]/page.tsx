import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getArtworkBySlug } from "@/lib/queries/get-artwork-by-slug";
import { getRelatedPieces } from "@/lib/queries/get-related-pieces";
import { getLooksFamiliar, type FamiliarEntry } from "@/lib/queries/get-looks-familiar";
import { getWhatElseWasHappening } from "@/lib/queries/get-what-else-was-happening";
import PassportControls from "@/components/PassportControls";
import { INSTITUTION_REFERENCE } from "@/lib/institutions/reference";
import { slugify } from "@/lib/ingest/normalize-met";

// Ticket 03 scope: Overview, Understand, and Sources. Ticket 09 adds Related pieces.
// Ticket 13 adds Where to see it as its own tab (§6 lists six: Overview, Understand,
// Related pieces, Where to see it, Journey, Sources — it had been folded into Overview).
// Journey (provenance) stays deferred to Phase 2 (§3) —
// see docs/superpowers/specs/2026-09-08-art-atlas-product-definition-and-sitemap.md.

type RelatedView = "grid" | "comparison" | "map";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArtworkBySlug(prisma, slug);
  if (!data) return {};

  const { artwork, physicalObject, fields } = data;
  const image = physicalObject?.images[0] ?? null;
  const dateAssertion = fields.get("creationDate");
  const title = artwork.artist ? `${artwork.title}, ${artwork.artist.name}` : artwork.title;
  const description = [
    artwork.title,
    artwork.artist?.name,
    dateAssertion?.value,
    physicalObject?.institution?.name,
  ]
    .filter(Boolean)
    .join(" — ");

  return {
    title,
    description,
    openGraph: image
      ? { title, description, images: [{ url: image.sourceUrl, alt: image.altText ?? artwork.title }] }
      : { title, description },
  };
}

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
  const looksFamiliar = await getLooksFamiliar(prisma, artwork.id);
  const familiarGroups: { heading: string; entries: FamiliarEntry[] }[] = [
    { heading: "Shares a subject", entries: looksFamiliar.subject },
    { heading: "Shares a technique or medium", entries: looksFamiliar.technique },
    { heading: "Shares a movement", entries: looksFamiliar.movement },
    { heading: "A documented influence", entries: looksFamiliar.documentedInfluence },
  ].filter((g) => g.entries.length > 0);
  const whatElse = await getWhatElseWasHappening(prisma, artwork.id);

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
                        <p>
                          <Link href={`/compare?slug=${artwork.slug}&slug=${rp.artwork.slug}`}>
                            Compare with this work
                          </Link>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}

              {relatedView === "comparison" && (
                <table className="comparison-table">
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
                      <td data-label="Image">
                        {image && <img src={image.sourceUrl} alt={image.altText ?? artwork.title} width={100} />}
                      </td>
                      <td data-label="Title">{artwork.title} (this work)</td>
                      <td data-label="Artist">{artwork.artist?.name}</td>
                      <td data-label="Date">{dateAssertion?.value}</td>
                      <td data-label="Medium">{physicalObject?.medium}</td>
                      <td data-label="Dimensions">{physicalObject?.dimensions}</td>
                      <td data-label="Collection">{physicalObject?.institution?.name}</td>
                      <td data-label="Relationship">—</td>
                    </tr>
                    {relatedPieces.slice(0, 3).map((rp) => {
                      const rpImage = rp.artwork.physicalObjects.flatMap((po) => po.images)[0];
                      const rpObject = rp.artwork.physicalObjects[0];
                      return (
                        <tr key={rp.relationship.id}>
                          <td data-label="Image">
                            {rpImage && (
                              <img src={rpImage.sourceUrl} alt={rpImage.altText ?? rp.artwork.title} width={100} />
                            )}
                          </td>
                          <td data-label="Title">
                            <Link href={`/artwork/${rp.artwork.slug}`}>{rp.artwork.title}</Link>
                          </td>
                          <td data-label="Artist">{rp.artwork.artist?.name}</td>
                          <td data-label="Date">{rp.date}</td>
                          <td data-label="Medium">{rpObject?.medium}</td>
                          <td data-label="Dimensions">{rpObject?.dimensions}</td>
                          <td data-label="Collection">{rpObject?.institution?.name}</td>
                          <td data-label="Relationship">{rp.label}</td>
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

        <section aria-labelledby="familiar-heading">
          <h2 id="familiar-heading">Why does this look familiar?</h2>
          <p>
            Pattern matches over data already in our catalogue — a resemblance, not a claim of
            historical connection the way a documented related piece is.
          </p>
          {familiarGroups.length === 0 ? (
            <p>No pattern matches found for this piece yet.</p>
          ) : (
            familiarGroups.map((group) => (
              <div key={group.heading}>
                <h3>{group.heading}</h3>
                <ul>
                  {group.entries.map((entry) => (
                    <li key={entry.slug}>
                      <Link href={`/artwork/${entry.slug}`}>
                        {entry.imageUrl && <img src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} width={120} />}
                        <p>{entry.title}</p>
                      </Link>
                      {entry.artistName && <p>{entry.artistName}</p>}
                      <p>{entry.explanation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <section aria-labelledby="contemporaries-heading">
          <h2 id="contemporaries-heading">What else was happening then?</h2>
          {whatElse.entries.length === 0 ? (
            <p>
              We don&apos;t have a confident date for this piece, so we can&apos;t place it against
              its contemporaries yet.
            </p>
          ) : (
            <>
              <p>
                Other works in our catalogue made within about {whatElse.windowYears} years —
                dates are often themselves approximate, and a shared era isn&apos;t evidence of any
                connection between the pieces.
              </p>
              <ul>
                {whatElse.entries.map((entry) => (
                  <li key={entry.slug}>
                    <Link href={`/artwork/${entry.slug}`}>
                      {entry.imageUrl && (
                        <img src={entry.imageUrl} alt={entry.imageAlt ?? entry.title} width={120} />
                      )}
                      <p>{entry.title}</p>
                    </Link>
                    {entry.artistName && <p>{entry.artistName}</p>}
                    <p>{entry.dateDisplay}</p>
                    {entry.placeOrCulture ? (
                      <p>{entry.placeOrCulture}</p>
                    ) : (
                      <p>Place/culture not recorded</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="where-heading">
          <h2 id="where-heading">Where to see it</h2>
          {physicalObject?.institution ? (
            <>
              <dl>
                <dt>Institution</dt>
                <dd>
                  <Link href={`/museum/${physicalObject.institution.slug}`}>{physicalObject.institution.name}</Link>
                </dd>
                {physicalObject.institution.city && (
                  <>
                    <dt>City</dt>
                    <dd>
                      <Link href={`/city/${slugify(physicalObject.institution.city)}`}>
                        {physicalObject.institution.city}
                      </Link>
                    </dd>
                  </>
                )}
                <dt>Display status</dt>
                <dd>{(physicalObject.displayStatus ?? "unconfirmed").replace(/_/g, " ")}</dd>
                <dt>Public access</dt>
                <dd>{(physicalObject.publicAccess ?? "unknown").replace(/_/g, " ")}</dd>
              </dl>
              {INSTITUTION_REFERENCE[physicalObject.institution.slug] && (
                <p>
                  <a
                    href={INSTITUTION_REFERENCE[physicalObject.institution.slug].visitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Official visit information
                  </a>
                  {" — "}an institution holding a work, or a general museum-access grant,
                  doesn&apos;t establish that this specific piece is currently on view.
                  Check before visiting.
                </p>
              )}
            </>
          ) : (
            <p role="status">No holding institution on record for this piece.</p>
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
