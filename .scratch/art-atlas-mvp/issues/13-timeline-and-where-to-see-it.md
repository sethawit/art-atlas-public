# 13 — Timeline + Where to see it (gap closure)

**What to build:** Two real gaps found during a fresh master-prompt-vs-implementation comparison, not part of the original 12-ticket backlog:

1. `/timeline` — §3's Phase 1 allowance: "establish a useful initial timeline in Phase 1 if verified metadata makes it inexpensive." It is: reads `creationDate` Assertions already ingested, no new source. §6's primary nav (Explore, Timeline, Map, My Art Passport) had a dead link's worth of gap — no Timeline anywhere.
2. "Where to see it" as its own tab on the artwork page. §6 specifies six tabs (Overview, Understand, Related pieces, Where to see it, Journey, Sources); institution/display-status had been folded into Overview instead of getting its own tab. Journey (provenance) stays deferred — that's genuinely Phase 2 per §3.

**Blocked by:** none — both are read-only extensions of data already in the database.

**Status:** done

- [x] `/timeline` groups artworks by century using real `creationDate` data, labels precision (approximate/disputed), and puts the one BC-dated, non-sortable work in an explicit "Undated in our records" bucket rather than dropping or misplacing it
- [x] Timeline added to primary nav, matching §6's stated order
- [x] "Where to see it" is its own artwork-page section: institution (linked), city (linked), display status, public access, official visit link — verified live, Overview no longer duplicates institution/display status
- [x] Added `PhysicalObject.publicAccess` (§7's public-access concept had zero representation before this) — defaults to `museum_access`, not `unknown`: every current source (Met, AIC) is a verified public museum, a stable institutional fact, not a per-object guess
- [x] Verified live: real century buckets (11th–20th, matching the corpus's actual 1075–1975 span) render with real titles/dates; "Where to see it" shows real institution/city/status/visit-link for a real artwork
- [x] 66 tests passing (2 new, covering the century-label suffix logic's real edge cases — 11th/12th/13th vs. 21st), typecheck clean

**Real snag caught while building this:** a schema migration was applied while the dev server was already running, and the long-running process kept its stale in-memory Prisma Client — `publicAccess` showed "unknown" in the browser even though the database correctly had "museum_access". Restarting the dev server fixed it; not a code bug, a dev-workflow gotcha worth remembering (restart after schema changes, don't just trust hot-reload).
