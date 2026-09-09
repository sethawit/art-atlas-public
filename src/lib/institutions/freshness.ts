// §7: "Define a configurable freshness policy rather than inventing universal update
// guarantees." displayStatus and publicAccess (PhysicalObject) have no live feed from
// either source (Met/AIC) — they're set once at ingest time and only change when we
// re-ingest that object. `updatedAt` is therefore a real "last verified against the
// source" signal, not a proxy for anything else: write-normalized-artwork.ts touches
// every PhysicalObject field on each re-ingest, so updatedAt reflects the last time this
// record was actually checked against the Met/AIC API, not just when it was created.
//
// The threshold is a named, documented choice — not a universal claim about how fast
// museum displays change. Display status/public access are called out in the Phase 2
// plan (ticket 23) as the fields most likely to go stale fastest, distinct from
// slower-changing fields like medium/dimensions/accession number, which this policy
// deliberately doesn't gate — there is no source claiming those change at all.
export const DISPLAY_STATUS_FRESHNESS_DAYS = 180;

export function daysSince(date: Date, now: Date = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function isDisplayStatusStale(lastVerified: Date, now: Date = new Date()): boolean {
  return daysSince(lastVerified, now) > DISPLAY_STATUS_FRESHNESS_DAYS;
}
