import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getArtworkAssertionsForReview, getArtworkRelationshipsForReview } from "@/lib/admin/queries";
import { approveAssertion, removeImage, reviewRelationship } from "@/lib/admin/actions";
import { resolveImageUrl } from "@/lib/images/proxied-image-url";

export default async function AdminArtworkReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { slug },
    include: { physicalObjects: { include: { images: { where: { removedAt: null } } } } },
  });
  if (!artwork) notFound();

  const byField = await getArtworkAssertionsForReview(prisma, artwork.id);
  const relationships = await getArtworkRelationshipsForReview(prisma, artwork.id);
  const activeImage = artwork.physicalObjects.flatMap((po) => po.images)[0] ?? null;

  return (
    <main>
      <h1>Review: {artwork.title}</h1>

      <section aria-labelledby="image-heading">
        <h2 id="image-heading">Image</h2>
        {activeImage ? (
          <>
            <img src={resolveImageUrl(activeImage)} alt={activeImage.altText ?? artwork.title} width={200} />
            <form
              action={async () => {
                "use server";
                await removeImage(activeImage.id);
              }}
            >
              <button type="submit">Remove image (ineligible / incorrect)</button>
            </form>
          </>
        ) : (
          <p>No active image.</p>
        )}
      </section>

      <section aria-labelledby="fields-heading">
        <h2 id="fields-heading">Fields</h2>
        {Array.from(byField.entries()).map(([field, assertions]) => (
          <fieldset key={field}>
            <legend>{field}</legend>
            <ul>
              {assertions.map((a) => (
                <li key={a.id}>
                  <strong>{a.isPreferred ? "[preferred] " : ""}</strong>
                  {a.value} — {a.source.name} (retrieved {a.retrievedAt.toISOString().slice(0, 10)})
                  {a.selectionReason && <em> — {a.selectionReason}</em>}
                  {!a.isPreferred && (
                    <form
                      action={async () => {
                        "use server";
                        await approveAssertion(a.id);
                      }}
                    >
                      <button type="submit">Approve as preferred</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </section>

      <section aria-labelledby="relationships-heading">
        <h2 id="relationships-heading">Relationships</h2>
        {relationships.length === 0 ? (
          <p>No relationships touch this artwork.</p>
        ) : (
          <ul>
            {relationships.map((rel) => (
              <li key={rel.id}>
                <strong>[{rel.reviewStatus}]</strong> {rel.relationshipType}:{" "}
                {rel.subjectArtwork.title} → {rel.objectArtwork.title} — {rel.explanation}
                {" — "}
                <a href={rel.evidenceSource.url}>{rel.evidenceSource.name}</a>
                <form
                  action={async () => {
                    "use server";
                    await reviewRelationship(rel.id, rel.reviewStatus === "flagged" ? "approved" : "flagged");
                  }}
                >
                  <button type="submit">
                    {rel.reviewStatus === "flagged" ? "Unflag" : "Flag — hide from public pages"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
