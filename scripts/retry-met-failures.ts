// Usage: npx tsx scripts/retry-met-failures.ts
//
// Ticket 32 — recovers the 82 real Met objects that failed during ticket 18's second
// growth run, not because they were bad candidates but because that run applied zero
// rate-limit spacing on the Met side (fixed now — see MET_REQUEST_SPACING_MS in
// src/lib/ingest/bulk-ingest.ts). These are free wins: already-identified, real,
// public-domain Met object IDs, just never retried since the 200-500 target was already
// met without them.
//
// Writes new IngestLog rows rather than mutating the old failure rows — the old rows
// stay as an honest record that a retry was needed, matching how this system never
// upserts log entries.
import { prisma } from "@/lib/prisma";
import { ingestMetArtwork } from "@/lib/ingest/ingest-met-artwork";
import { MET_SOURCE_NAME, MET_REQUEST_SPACING_MS, logIngest, withRetry } from "@/lib/ingest/bulk-ingest";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const failures = await prisma.ingestLog.findMany({
    where: { sourceName: MET_SOURCE_NAME, status: "failure" },
    select: { externalId: true },
  });
  const objectIds = Array.from(new Set(failures.map((f) => Number(f.externalId))));
  console.log(`${objectIds.length} distinct Met object ids previously logged as failures.`);

  let succeeded = 0;
  let flagged = 0;
  let stillFailed = 0;

  for (const objectId of objectIds) {
    await sleep(MET_REQUEST_SPACING_MS);
    try {
      const result = await withRetry(() => ingestMetArtwork(prisma, objectId));
      if (result.duplicateFlagged) flagged++;
      else succeeded++;
      await logIngest(prisma, {
        sourceName: MET_SOURCE_NAME,
        externalId: String(objectId),
        status: result.duplicateFlagged ? "flagged_duplicate" : "success",
        message: result.duplicateFlagged ? "Slug collision — see DuplicateFlag" : undefined,
        artworkId: result.artwork.id,
      });
    } catch (err) {
      stillFailed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Still failing: ${objectId} — ${message}`);
      await logIngest(prisma, { sourceName: MET_SOURCE_NAME, externalId: String(objectId), status: "failure", message });
    }
  }

  console.log(`Attempted: ${objectIds.length}, succeeded: ${succeeded}, flagged_duplicate: ${flagged}, still failed: ${stillFailed}.`);
  await prisma.$disconnect();
}

main();
