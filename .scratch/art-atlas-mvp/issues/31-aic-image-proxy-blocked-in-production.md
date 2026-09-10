# 31 — AIC image proxy built, but still blocked in production (not resolved)

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

## Root cause confirmed (systematic-debugging pass, resumed later)

The "most likely IP/ASN reputation" hedge above is now confirmed, not guessed. Added
temporary diagnostic instrumentation to the proxy (returned the upstream response's own
headers/body instead of swallowing them), deployed once, hit it live:

```
status: 403
headers: { "server": "cloudflare", "cf-ray": "a38fb90b0d1e72f2-IAD", ... }
bodySnippet: "<title>Attention Required! | Cloudflare</title>" ...
```

This is Cloudflare's static WAF block page (no `cf-mitigated`/JS-challenge header, unlike
a bot-score heuristic) — a **network/ASN-level firewall rule**, not something satisfiable
by any request header. The identical request, byte-for-byte same headers, returns 200
from a residential/dev-sandbox IP and 403 from Vercel's own compute (any region — Hobby
tier ignores `preferredRegion` anyway, and every Vercel region is still a cloud-hosting
ASN). Diagnostic code removed after confirming; this comment plus the route's own header
comment carry the finding forward.

**This rules out option 1 (Vercel Pro + region) as worth testing** — the block is at the
ASN layer, not the region, so paying for region selection has no plausible path to
success. The only architecturally sound fix is **option 2**: fetch each AIC image once
from a network AIC doesn't block (this session's dev sandbox already does — ingestion
already runs from there) and serve our own stored copy, never live-proxying through
Vercel's compute again. Option 3 (disclose and stop) remains the zero-effort fallback.
Still not picked unilaterally — needs the user's call given the storage/scope cost.

## Option 2 built and run — status: 259/264 real, live-verified

- [x] Provisioned a public Vercel Blob store (`art-atlas-images`), first-party product,
      no marketplace ToS gate unlike Neon earlier.
- [x] `scripts/cache-aic-images.ts` — run from this dev machine (a network AIC doesn't
      block), fetches each AIC-sourced `ImageAsset` once and stores it in Blob under a
      deterministic pathname (`blobPathnameFor`, exported from and shared with the route
      so the two files can't drift out of sync). Safe to re-run — `head()`-checks first,
      skips what's already cached, so picking up future ingestion runs is just re-running
      this script, nothing bespoke needed per-run.
- [x] **Real sub-finding, isolated live before trusting the fix**: Node's built-in
      `fetch` (undici) gets 403 from AIC even from this non-blocked dev IP, with the
      exact same headers curl gets 200 with — confirmed by running both back-to-back.
      Ticket 31's original "ASN-level" read was incomplete: it's (at least also) a
      TLS/HTTP client fingerprint check — undici's fingerprint is flagged, curl's isn't.
      Fixed by having the backfill script shell out to `curl` instead of using Node's
      `fetch` (not disguising anything new — using the HTTP client that demonstrably
      isn't flagged, for a request this project has every right to make).
- [x] `src/app/api/image-proxy/route.ts` now checks Blob first (`head()` + 302 redirect
      to the blob's own URL) and only falls back to the still-broken live AIC fetch for
      an image that hasn't been backfilled yet.
- [x] Backfill run twice (idempotent): **259/264 cached**, 5 genuine per-object failures
      (not transient — re-ran, same 5 both times): 1 real 404 (image no longer at that
      IIIF id) and 4 real 403s with a *different* body than the Cloudflare block page
      (`content-type: text/plain`, Cantaloupe/IIIF-server-level, not the WAF) — a
      per-object access issue on AIC's end, not this project's bug. Those 5 objects keep
      the same degrade they had before this fix (broken image, no worse).
- [x] 8 new/updated tests (Blob-hit redirect path, Blob-miss fallback path, existing
      allowlist/error tests updated to mock Blob's `head()`), 145 total, stable across 3
      consecutive runs, typecheck clean.
- [x] Live-verified on production after deploy: `/compare?slug=wheat-field-with-cypresses&slug=water-lilies`
      (the exact page this session's original AIC-image bug was found on) — the
      previously-broken AIC image now renders for real.
