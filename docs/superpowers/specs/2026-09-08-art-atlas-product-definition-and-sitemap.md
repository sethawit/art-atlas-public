# Art Atlas — Product Definition and Sitemap

Source: `art-atlas-master-prompt.md` (repo root). This document covers deliverables 1 and 3 from that prompt's §16: product definition and sitemap. Deliverable 2 (MVP backlog) is tracked separately as tickets under `.scratch/art-atlas-mvp/issues/`.

## 1. Product Definition

### Working name

Art Atlas (provisional — no claim of brand or domain availability).

### Core promise

Discover an artwork. Understand its connections. Find where to see it.

### Brand idea

Every artwork has a story, a family, and a journey. Explore all three.

### Target users

Curious beginners, museum visitors, travellers, students, and art enthusiasts. The default experience assumes no prior art terminology; deeper sources and detail are available but not required for the first view.

### Questions the product must answer

- What is this artwork, and who created it?
- When and where was it made? Is that date exact, approximate, or disputed?
- Which period, movement, tradition, or style is associated with it, and why?
- What should I notice in its composition, colour, brushwork, material, and subject?
- What related artworks, artists, and styles should I explore next?
- Are there other versions, studies, pieces in the series, print impressions, or casts?
- Where is each documented physical piece held?
- Can I actually see it now, and what information is still unconfirmed?
- Who has owned it, when that information is public and documented?
- What saved works could I see in a particular city?

### Differentiator

A continuous journey from understanding an artwork, to discovering the related pieces that extend its story, to finding where to see them. Connections are explanatory (each relationship is labeled and sourced), not a bare grid of visually-similar images.

### Assumptions recorded

- Phase 1 sources are the Met Collection API and the Art Institute of Chicago API only (see §8 of the master prompt for the full candidate source list; Europeana, Wikidata, and the Getty vocabularies remain enrichment/reconciliation sources for later phases, not primary Phase 1 ingestion targets).
- MVP saved lists (Art Passport) are local-device only, no account system; this is disclosed to the user in-product.
- No paywalls, affiliate recommendations, ticket sales, or sponsored rankings in the MVP.

### Phased scope

**Phase 1 — Working curated MVP.** Target 200–500 verified artworks sourced from the Met and AIC. Homepage with search and a featured artwork family; searchable catalogue with filters; artwork detail pages with citations; artist pages; concise movement/style pages; at least 10 verified related-piece stories (report any shortfall honestly rather than padding); related-piece explorer with grid/comparison/map views; map/list of holding institutions; Art Passport (Want to see / Seen / Want to understand, local-only); source-aware content administration with a basic ingestion/update workflow; responsive, keyboard-accessible layout with loading/empty/error states.

**Phase 2 — Deeper discovery.** Interactive historical timelines, richer relationship exploration, publicly documented provenance, additional collections beyond Met/AIC, location freshness management.

**Phase 3 — Intelligence and travel.** Photo identification, semantic search, image similarity, source-grounded AI explanations, synced accounts, city itineraries, availability alerts (only once an authorised, maintainable source supports them).

Non-working future features must never appear as active controls. Prototype, connected functionality, curated data, and roadmap items must remain visually distinguishable from one another at all times.

## 2. Sitemap

### Primary navigation

`Explore` · `Timeline` · `Map` · `My Art Passport` — with global search always available regardless of current page.

### URL scheme

Slug-based, one canonical URL per entity:

| Entity | URL pattern | Example |
|---|---|---|
| Artwork | `/artwork/<slug>` | `/artwork/starry-night-1889` |
| Artist | `/artist/<slug>` | `/artist/vincent-van-gogh` |
| Movement / style / period | `/movement/<slug>` | `/movement/post-impressionism` |
| Museum / institution | `/museum/<slug>` | `/museum/art-institute-of-chicago` |
| City | `/city/<slug>` | `/city/chicago` |
| Search / explore | `/explore` | `/explore?movement=post-impressionism&medium=oil` (filters preserved in URL) |
| Timeline | `/timeline` | — |
| Map | `/map` | — |
| My Art Passport | `/passport` | — |

Slug collisions (e.g. two artists sharing a name) are resolved by appending a disambiguator at creation time (e.g. `-2`); slugs are treated as stable identifiers once published and are not silently reassigned.

### Page tree

```
/                               Homepage
├── /explore                    Searchable catalogue (filters: date range, movement/style,
│                                medium, museum, city, display status — all in URL)
├── /timeline                   Cross-region "what else was happening then" view (Phase 2+;
│                                a minimal Phase 1 version ships if metadata makes it cheap)
├── /map                        Map/list of holding institutions linked to catalogued artworks
├── /passport                   My Art Passport — Want to see / Seen / Want to understand,
│                                private notes, filter by city/artist/style
├── /artwork/<slug>              Artwork detail page
│   ├── Overview                 Short accessible summary
│   ├── Understand               Composition, colour, brushwork, material, subject notes
│   ├── Related pieces           Family Explorer: grid / comparison / map views
│   ├── Where to see it          Current holding institution, display status, public access
│   ├── Journey                  Documented ownership + exhibition/loan events, gaps shown explicitly
│   └── Sources                  Citations for every substantive claim on the page
├── /artist/<slug>               Artist page — bio, lifespan, places worked, styles (with
│                                context — no single label applied across a multi-period
│                                artist), selected works, related artists, holding museums
├── /movement/<slug>             Period/movement/style page — term explanation, approximate
│                                dates and geography, characteristics, representative works,
│                                associated artists, overlapping traditions, predecessor/
│                                successor links where supported
└── /museum/<slug>               Museum/city page — institution details, catalogue coverage,
    (or /city/<slug>)             official visit link, artworks in our catalogue, saved works,
                                   hours/tickets/exhibitions shown only from an appropriate
                                   current source with freshness info
```

Compare view (`/compare?slug=<a>&slug=<b>&...`, built ticket 22 — repeated `slug` params rather than the originally-sketched `a`/`b`, so it isn't capped at a fixed number of named params) is reached from Related pieces and Explore, not a standalone nav item — up to 4 works on desktop, 2 on mobile.

### States every primary page must handle

Loading, empty, error/offline, unavailable image, no-match (Explore), unknown location (artwork/museum pages) — per master prompt §12/§14. No primary action ships without a working destination and visible feedback.
