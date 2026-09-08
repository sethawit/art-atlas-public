import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAdminDashboardCounts } from "@/lib/admin/queries";

export default async function AdminDashboard() {
  const { totalArtworks, pendingDuplicateFlags, recentFailures, artworksNeedingReview } =
    await getAdminDashboardCounts(prisma);

  return (
    <main>
      <h1>Admin</h1>
      <dl>
        <dt>Total artworks</dt>
        <dd>{totalArtworks}</dd>
        <dt>Pending duplicate flags</dt>
        <dd>
          {pendingDuplicateFlags}
          {pendingDuplicateFlags > 0 && <> — <Link href="/admin/duplicates">review</Link></>}
        </dd>
        <dt>Recent ingest failures</dt>
        <dd>{recentFailures.length}</dd>
      </dl>

      {recentFailures.length > 0 && (
        <section aria-labelledby="failures-heading">
          <h2 id="failures-heading">Recent ingest failures</h2>
          <ul>
            {recentFailures.map((f) => (
              <li key={f.id}>
                {f.sourceName} #{f.externalId} — {f.message ?? "no message"} ({f.createdAt.toISOString()})
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="review-heading">
        <h2 id="review-heading">Artworks with a field needing review</h2>
        {artworksNeedingReview.length === 0 ? (
          <p>None right now.</p>
        ) : (
          <ul>
            {artworksNeedingReview.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/artworks/${a.slug}`}>{a.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
