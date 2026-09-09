# 30 — Full visual redesign

**What to build:** Redesign the whole app's visual identity, requested directly rather
than found as a master-prompt gap. §12 requires "a real design system, not a wireframe" —
already true since ticket 12 — this is a deliberate second pass on that system's identity,
not a gap-fix.

**Blocked by:** none.

**Status:** done

## Concept

The old system ("museum wall-label meets catalogue entry," ticket 12) was already
considered, not generic — this redesign moves to a more specific identity: **the atlas,
not the wall label.** Art Atlas doesn't only describe a painting, it tracks where the
piece has been and where it stands now — Journey/provenance, display status, city and
museum geography, the Map page. The visual language now borrows from printed atlases and
accession ledgers: chart-paper ground, a single cartographer's-ink blue for wayfinding,
ruled "plate" borders around any documented image, and small ledger-stamp tags (never
color alone) for verification state. Near-zero corner radius throughout — a plate is
bordered, not rounded; the one exception is the round tag-list chip, a deliberately
different shape for a different kind of object (a label, not a plate).

- [x] **Color** — cool vellum paper (`#ece7d9`/`#faf8f1`), green-black ink, a deep
      cartographer blue accent (`#1b4b66`) replacing the previous teal, moss-green
      "verified" and ochre "unverified" tags (status is still always spelled out as text,
      never color-only — carried forward from ticket 12), brick red reserved narrowly for
      alerts.
- [x] **Type** — Fraunces (titles, wordmark, nav, buttons — the engraved "plate" voice)
      replacing Libre Franklin; Newsreader (reading prose) replacing Source Serif 4 — both
      serif, but built for different jobs, not a sans/serif split.
- [x] **Signature device** — a short accent tick precedes every `h2` instead of a
      full-width rule (a benchmark mark, not a decoration).
- [x] **Index-card grids** (`.card-grid`) — every browsable work list (artist, museum,
      city, movement, timeline, explore results, "familiar"/"what else" groups, passport)
      now renders as bordered index cards with the photo bled to the top edge, instead of
      a bare `<ul>`. Text-only browsing lists (artist tags, museum tags, style tags,
      suggested artists) get `.tag-list` — rounded chips, the system's one intentional
      round shape.
- [x] **Status tags** (`.status-tag`) — display status and public access on the artwork
      page, and each related piece's display status, now render as a bordered ledger-stamp
      tag (verified/unverified), word always printed, never color-only.
- [x] **Journey as a route** (`.route-list`) — ownership/exhibition history now renders
      down a ruled left-edge line with a route dot per entry, since this data is literally
      a sequence through time (not a generic numbered list).
- [x] Hero (home page) — headline and search left, the featured work framed right in a
      `.plate`, replacing the previous single-column stack.
- [x] Header — wordmark plus a real tagline ("a field guide to painted places"), nav
      active/hover state now an underline in the accent color rather than a color swap
      alone.
- [x] Admin pages, error/not-found/loading — untouched structurally (deliberately
      utilitarian), inherit the new tokens automatically since they use only semantic
      HTML the global stylesheet already styles.
- [x] Verified live: 130 tests stable, `tsc --noEmit` clean, and real browser screenshots
      (home, artwork, compare) against the user's own running dev server — index-card
      grids, status tags, the plate hero, and the ledger comparison table all render
      correctly, not just typecheck.

**Known limitation carried forward, not new:** the AIC-CDN local-dev image-loading issue
documented earlier this session (Cloudflare blocks no-referrer/localhost-referrer image
requests) is unrelated to this redesign and unaffected by it — same behavior before and
after.
