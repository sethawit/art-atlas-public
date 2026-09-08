import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getArtworkBySlug } from "@/lib/queries/get-artwork-by-slug";

// Ticket 03 scope: Overview, Understand, and Sources only. Related pieces (ticket 09),
// Where to see it (ticket 10), and Journey (Phase 2, §5) extend this same page later —
// see docs/superpowers/specs/2026-09-08-art-atlas-product-definition-and-sitemap.md.

export default async function ArtworkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getArtworkBySlug(prisma, slug);
  if (!data) notFound();

  const { artwork, physicalObject, fields } = data;
  const image = physicalObject?.images[0] ?? null;
  const dateAssertion = fields.get("creationDate");
  const bioAssertion = fields.get("artistBio");
  const tagsAssertion = fields.get("subjectTags");
  const recordUrlAssertion = fields.get("sourceRecordUrl");

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
