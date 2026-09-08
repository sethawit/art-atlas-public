import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getArtworkAssertionsForReview } from "@/lib/admin/queries";
import { approveAssertion, removeImage } from "@/lib/admin/actions";

export default async function AdminArtworkReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { slug },
    include: { physicalObjects: { include: { images: { where: { removedAt: null } } } } },
  });
  if (!artwork) notFound();

  const byField = await getArtworkAssertionsForReview(prisma, artwork.id);
  const activeImage = artwork.physicalObjects.flatMap((po) => po.images)[0] ?? null;

  return (
    <main>
      <h1>Review: {artwork.title}</h1>

      <section aria-labelledby="image-heading">
        <h2 id="image-heading">Image</h2>
        {activeImage ? (
          <>
            <img src={activeImage.sourceUrl} alt={activeImage.altText ?? artwork.title} width={200} />
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
    </main>
  );
}
