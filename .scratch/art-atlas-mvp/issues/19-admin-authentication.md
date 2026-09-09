# 19 — `/admin` authentication

**What to build:** Access control for `/admin` — currently unauthenticated, flagged with
an on-page banner as a stopgap. §14: "no fake metrics, unsupported completeness claims,
broken primary controls, or exposed credentials" — an open admin surface that can approve
assertions, remove images, or resolve duplicate flags is a real risk before any public
deployment, not covered by the disclosure banner alone.

**Blocked by:** none — but should land before any deployment step, not necessarily before
other Track A items.

**Status:** done

- [x] `src/middleware.ts`: HTTP Basic Auth, matcher `/admin/:path*`, checked against a
      single `ADMIN_PASSWORD` env var — proportional to a single-operator MVP, no
      over-built roles/`User` system
- [x] Fails closed: if `ADMIN_PASSWORD` isn't set, `/admin` returns 503 rather than
      silently being open
- [x] Server-side only — the password never reaches the client (§13)
- [x] A Server Action call POSTs back to the same page URL it was invoked from, so the
      same path matcher gates both the pages and their mutating actions — no separate
      action route needed. Verified live: unauthenticated `POST /admin/duplicates` → 401;
      authenticated → 200
- [x] Verified live end-to-end: no-auth → 401, wrong password → 401, correct password →
      200, an unrelated page (`/`) unaffected → 200
- [x] `.env.example` documents the new var (empty value, no secret committed)
- [x] Admin layout banner updated from "unauthenticated" warning to a real "protected"
      status note
- [x] README's admin-related Known-limitations bullet removed
- [x] 83 tests passing (no test changes — middleware isn't exercised by the vitest suite,
      which calls query/mutation functions directly, not through HTTP), typecheck clean
