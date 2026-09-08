# ADR 0001: Phase 1 technical stack

## Status

Accepted — 2026-09-08

## Context

Art Atlas needs a small, maintainable stack (master prompt §13) that supports:

- A relational database with explicit relationship tables (§10, §13) — the data model distinguishes named artistic works from physical objects, series from editions, and needs multi-valued Assertions with source/date/precision metadata.
- Public detail pages rendered in a search-engine-friendly way, with stable canonical URLs (§13).
- A background ingestion pipeline with pagination, caching, retries, and rate-limit handling per source (§9) — the Met and AIC APIs have different rate limits and pagination shapes (see `docs/sources/source-register.md`).
- Server-side API keys / credentials, never exposed to the client (§13).
- A small team (effectively solo) able to move through Phase 1 without adopting infrastructure that doesn't earn its cost yet (no vector DB, no graph DB, no dedicated queue service, until a concrete need justifies one — §13).

## Decision

- **Framework:** Next.js (App Router, TypeScript). Server-rendered pages give SEO-friendly artwork/artist/movement pages for free; API routes / server actions host the ingestion adapters and admin workflow without a separate backend service.
- **Database:** PostgreSQL. Relational, supports explicit relationship tables and JSON columns where an Assertion's raw source payload needs preserving without a rigid schema.
- **ORM / migrations:** Prisma. Migration history is explicit and reviewable; the generated client gives typed access matching the domain model in §10.
- **Search:** Postgres full-text search (`tsvector`) for Phase 1 Explore/search, per §13's instruction to start with database text search. Vector retrieval is deferred to Phase 3 (§3) when semantic search is in scope.
- **Local/dev database:** a `docker compose` Postgres 16 container — no external account required to develop or run tests.

## Consequences

- Ingestion adapters, admin review workflow, and public pages all live in one Next.js codebase for Phase 1 — simplest possible deployment shape, revisit only if ingestion workload genuinely needs to scale independently of the web tier.
- Contributors need Docker (or a reachable Postgres connection string) to run migrations and tests locally.
- Moving to a dedicated search or graph layer later is an additive change (Prisma models stay the source of truth), not a rewrite.

## Alternatives considered

- **Rails + PostgreSQL** — equally reasonable (mature admin/ingestion tooling, Sidekiq for background jobs). Not chosen only to keep one language (TypeScript) across frontend, backend, and ingestion adapters, easing solo maintenance.
