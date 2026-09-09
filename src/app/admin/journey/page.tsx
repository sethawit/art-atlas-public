import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listUnreviewedJourneyEvents } from "@/lib/admin/queries";
import { reviewOwnershipEvent, reviewExhibitionEvent } from "@/lib/admin/actions";

// §9 item 7: "Review sensitive or uncertain relationships, attribution, provenance, and
// image rights." Ownership/exhibition events (ticket 25) were originally auto-published
// straight from AIC's raw text with no review gate — this page closes that. Still shows
// unreviewed rows publicly (real museum text, not a fabricated claim, so pending review
// isn't reason to hide it) — this page lets an admin flag one that's wrong to hide it.
export default async function JourneyReviewPage() {
  const { ownership, exhibitions } = await listUnreviewedJourneyEvents(prisma);

  return (
    <main>
      <h1>Journey review</h1>
      <p>
        Ownership and exhibition segments from AIC&apos;s provenance/exhibition text, most
        recent first. Everything here already displays on its artwork page — flagging one
        hides it from the public Journey tab without deleting the row; approving just
        marks it reviewed and drops it from this queue.
      </p>

      <h2>Ownership ({ownership.length})</h2>
      {ownership.length === 0 ? (
        <p>Nothing unreviewed.</p>
      ) : (
        <ul>
          {ownership.map((event) => (
            <li key={event.id}>
              <p>
                <Link href={`/artwork/${event.physicalObject.artwork.slug}`}>
                  {event.physicalObject.artwork.title}
                </Link>
                {" — segment "}
                {event.sequence + 1}
              </p>
              <p>{event.description}</p>
              <p>
                Source: <a href={event.source.url}>{event.source.name}</a>
              </p>
              <form
                action={async () => {
                  "use server";
                  await reviewOwnershipEvent(event.id, "approved");
                }}
              >
                <button type="submit">Approve</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await reviewOwnershipEvent(event.id, "flagged");
                }}
              >
                <button type="submit">Flag — hide from public page</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2>Exhibitions ({exhibitions.length})</h2>
      {exhibitions.length === 0 ? (
        <p>Nothing unreviewed.</p>
      ) : (
        <ul>
          {exhibitions.map((event) => (
            <li key={event.id}>
              <p>
                <Link href={`/artwork/${event.physicalObject.artwork.slug}`}>
                  {event.physicalObject.artwork.title}
                </Link>
                {" — segment "}
                {event.sequence + 1}
              </p>
              <p>{event.description}</p>
              <p>
                Source: <a href={event.source.url}>{event.source.name}</a>
              </p>
              <form
                action={async () => {
                  "use server";
                  await reviewExhibitionEvent(event.id, "approved");
                }}
              >
                <button type="submit">Approve</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await reviewExhibitionEvent(event.id, "flagged");
                }}
              >
                <button type="submit">Flag — hide from public page</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
