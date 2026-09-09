# 19 — `/admin` authentication

**What to build:** Access control for `/admin` — currently unauthenticated, flagged with
an on-page banner as a stopgap. §14: "no fake metrics, unsupported completeness claims,
broken primary controls, or exposed credentials" — an open admin surface that can approve
assertions, remove images, or resolve duplicate flags is a real risk before any public
deployment, not covered by the disclosure banner alone.

**Blocked by:** none — but should land before any deployment step, not necessarily before
other Track A items.

**Status:** planned

- [ ] Decide the mechanism proportional to actual need — a single shared admin password
      via middleware (simplest, matches "small maintainable stack" from §13) is likely
      enough for a single-operator MVP; don't over-build a full user/roles system the
      product doesn't otherwise have (no `User` model exists yet — §10 lists one for
      Passport account-sync, not built, correctly deferred)
- [ ] Keep the credential server-side only (§13: "Keep API keys server-side" — same
      principle applies to any admin secret)
- [ ] Gate every `/admin/*` route and the mutating Server Actions themselves, not just the
      page shell — a Server Action is callable directly even if its page is gated
- [ ] Remove the "unauthenticated" banner and the matching README bullet once real
