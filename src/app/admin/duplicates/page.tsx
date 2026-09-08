import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listPendingDuplicateFlags } from "@/lib/admin/queries";
import { resolveDuplicateFlag } from "@/lib/admin/actions";

export default async function DuplicatesPage() {
  const flags = await listPendingDuplicateFlags(prisma);

  return (
    <main>
      <h1>Duplicate flags</h1>
      <p>
        Raised when two source records share a title-slug but weren&apos;t verified as the
        same physical work (never auto-merged). Confirm distinct, or leave pending for a
        future merge decision — this page never merges records itself.
      </p>

      {flags.length === 0 ? (
        <p>No pending duplicate flags.</p>
      ) : (
        <ul>
          {flags.map((flag) => (
            <li key={flag.id}>
              <p>{flag.reason}</p>
              <ul>
                {[flag.artworkA, flag.artworkB].map((aw) => (
                  <li key={aw.id}>
                    <Link href={`/artwork/${aw.slug}`}>{aw.title}</Link>
                    {" — "}
                    {aw.physicalObjects[0]?.institution?.name ?? "institution unknown"}
                  </li>
                ))}
              </ul>
              <form
                action={async () => {
                  "use server";
                  await resolveDuplicateFlag(flag.id, "confirmed_distinct");
                }}
              >
                <button type="submit">Confirm distinct works</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await resolveDuplicateFlag(flag.id, "confirmed_duplicate");
                }}
              >
                <button type="submit">Flag for merge investigation</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
