# 31 — AIC image proxy built, but still blocked in production

**Update:** option 2 below ("cache AIC images ourselves") was picked and built — see
"Follow-up: image caching" at the bottom of this file. Code is complete and tested;
provisioning storage and running the backfill against production are the two remaining
manual steps.

**What was attempted:** a server-side proxy (`src/app/api/image-proxy`) to fix AIC-sourced
artwork images failing to load — AIC's Cloudflare protection 403s image requests with no
Referer, a localhost Referer, or our own domain as Referer, confirmed live earlier this
session. The proxy sets `Referer: https://www.artic.edu/` on its outbound fetch, which
passed reliably (repeatedly, from multiple test angles) from this session's dev sandbox IP.

**Status:** code shipped (tests pass, typecheck clean, legitimate approach — see commit
`21083fe`), but **does not fix the live bug**. Disclosing honestly rather than claiming a
win the live check doesn't support.

## What actually happened in production

- [x] Deployed, verified route responds, allowlist/rejection logic all correct (400s for
      bad input, working locally against a dev sandbox test).
- [x] **Real finding, only visible once deployed**: the proxy's own outbound fetch to AIC,
      running on Vercel's infrastructure, still gets **403** from AIC — even with the
      exact same Referer + User-Agent headers that returned 200 dozens of times from this
      session's dev sandbox IP. Confirmed via `x-vercel-id` response header
      (`sin1::iad1::...`) that the function executes in `iad1` (AWS us-east-1).
- [x] Tried `preferredRegion` to move the function off `iad1` in case the block is
      region/ASN-specific — Vercel's Hobby tier ignores this (confirmed live: `x-vercel-id`
      still shows `iad1` after redeploying with the hint set). Region selection needs a
      paid plan, and even then isn't confirmed to help — untested.
- [x] Conclusion: AIC's Cloudflare protection most likely also scores by IP/ASN reputation
      (a very plausible layer for a bot-mitigation product — cloud/datacenter IP ranges
      like AWS's are commonly scored more aggressively than residential ones), on top of
      the Referer check already diagnosed. A Referer header alone, from Vercel's shared
      Hobby IP range, is not enough.

## What was deliberately not attempted

Did not pursue anything that would specifically try to make Vercel's outbound request
*look like* it isn't coming from a datacenter (residential proxy services, IP rotation,
etc.) — that crosses from "legitimate embedding of a published API" into deliberate
anti-bot evasion, which is out of scope regardless of the underlying use case being
legitimate.

## Real remaining options, none picked unilaterally — needs a decision

1. **Vercel Pro + region selection** — costs money, and not confirmed to actually route
   around the block even if it moves the function off `iad1`/AWS entirely (Cloudflare's
   IP reputation data likely covers most major cloud ASNs, not just AWS us-east-1).
2. **Cache AIC images ourselves, once, from a non-blocked IP** — during ingestion (which
   already runs from a dev machine whose IP AIC doesn't block), download each AIC image
   once and store it in real object storage (e.g. Vercel Blob) instead of re-fetching from
   AIC on every request. This is a real architecture change (new storage resource, a
   backfill script for the existing 264 AIC-sourced images, and changing `ImageAsset` to
   optionally reference our own stored copy) — bigger than this ticket's original scope,
   not started.
3. **Accept as a known, disclosed external-dependency limitation** — keep the honest
   `role="status"` broken-image fallback wherever one already exists, document it in
   README's Known limitations, and move on. Costs nothing, ships nothing new either.

Nothing in this ticket was reverted — the proxy code stays (it's correct, tested, and a
real prerequisite for option 2 if that's chosen; it's also not actively harmful, just not
currently effective). No infra spend or new resource was provisioned without asking.

## Follow-up: image caching (option 2, picked)

Built:

- `ImageAsset.cachedUrl` (new nullable column, migration
  `20260910100000_image_asset_cached_url`) — our own stored copy of `sourceUrl`, null
  until cached.
- `src/lib/images/cache-aic-image.ts` — fetches an AIC IIIF image (same Referer/User-Agent
  as the proxy, now shared via `IIIF_FETCH_REFERER`/`IIIF_FETCH_USER_AGENT` in
  `src/lib/aic/client.ts`) and uploads it to Vercel Blob (`@vercel/blob`), returning the
  public blob URL. Throws clearly if `BLOB_READ_WRITE_TOKEN` isn't set.
- `src/lib/images/proxied-image-url.ts` gained `resolveImageUrl(image)` — the new render-
  path entry point, used everywhere an image is rendered. Prefers `image.cachedUrl`; falls
  back to the existing `proxiedImageUrl` (still correct for Met, still broken in prod for
  uncached AIC images) when there's no cached copy yet. `proxiedImageUrl` itself is
  unchanged.
- `ingest-aic-artwork.ts` now caches the image at ingest time (I/O, so it happens after the
  pure normalizer runs) and writes `cachedUrl` alongside the rest of the image. A caching
  failure is logged and does not fail the ingest — the render path still has the (weaker)
  proxy fallback.
- `scripts/cache-aic-images.ts` (`npm run cache:aic-images`) — one-off backfill for AIC
  `ImageAsset`s that predate this change. Rate-limited (1.1s spacing, matching
  `refresh-location-data.ts`'s existing AIC politeness convention), logs and continues past
  per-image failures, reports a final count.
- `write-normalized-artwork.ts`'s re-ingest path now preserves an existing `cachedUrl`
  rather than overwriting it with null on every re-ingest.
- Tests added to `tests/proxied-image-url.test.ts` for `resolveImageUrl`. `npx tsc
  --noEmit` and `next build`'s TypeScript/page-data-collection pass both clean (this
  sandbox has no live DB or `BLOB_READ_WRITE_TOKEN`, so the actual fetch-and-upload and the
  `/admin` prerender that needs a DB connection couldn't be exercised end-to-end here).

Not done — both require access this session doesn't have, and both are irreversible/
outward-facing enough to not do unprompted:

1. **Provision a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`** in the deployment
   environment.
2. **Run `npm run cache:aic-images`** once, from a machine with real (non-Vercel-function)
   network egress — same IP-blocking reason the live proxy doesn't work from `iad1`, so
   this cannot run as a Vercel function either. A dev machine or CI runner works, same as
   the rest of the ingest pipeline already does.

Until both of those happen, AIC images keep hitting the same blocked live-proxy path as
before — this ticket's code is a real fix, not yet a deployed one.
