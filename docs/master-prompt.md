# Art Atlas — Master Product and Build Prompt

Copy everything below into your AI product/design/coding assistant. This is a complete product brief; implement it in phases rather than attempting every future feature in one release.

---

## 1. Your role and assignment

Act as a senior product strategist, UX designer, full-stack engineer, and cultural-data architect. Help me design and build **Art Atlas**, a beautiful, reliable website connecting artworks, artists, art periods, movements, styles, related pieces, museums, and publicly documented ownership history.

Produce a concrete product specification and then implement the first working release if your environment supports website building. Make reasonable decisions and record assumptions. Ask only for genuinely blocking information. Do not stop at a generic landing page or a list of suggestions. Do not claim integrations or features work until they actually do. If only planning is possible, provide implementation-ready specifications and a prioritised backlog.

Working name: Art Atlas. Treat this as provisional, without implying brand or domain availability.

Core promise: **Discover an artwork. Understand its connections. Find where to see it.**

Brand idea: **Every artwork has a story, a family, and a journey. Explore all three.**

## 2. Product purpose and audience

Build for curious beginners, museum visitors, travellers, students, and art enthusiasts. The default experience should make sense to someone who does not know art terminology. Offer deeper sources and detail without overwhelming the first view.

The product should answer:

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

The differentiator is the continuous journey from understanding to related-piece discovery to visiting. Make connections explanatory, not merely a grid of similar images.

## 3. Product scope and release order

### Phase 1: Working curated MVP

Target 200–500 verified artworks across a small number of source institutions, subject to actual data and image availability. Begin implementation with a smaller verified slice and expand only after ingestion and rendering work.

Deliver:

1. Homepage with prominent search, a compelling featured artwork family, and clear entry points.
2. Searchable artwork catalogue with useful filters.
3. Rich artwork detail pages with citations.
4. Artist pages and concise movement/style pages.
5. At least 10 carefully verified related-piece stories as the eventual launch target; report any shortfall honestly.
6. Related-piece explorer and side-by-side comparison.
7. Map/list of holding institutions linked to artworks.
8. Art Passport: Want to see, Seen, Want to understand.
9. Source-aware content administration and a basic ingestion/update workflow.
10. Responsive layout, keyboard access, loading/empty/error states, and working navigation.

Use local saved lists for an account-free MVP if that reduces complexity. Explain that these remain on the device. Add account sync later.

### Phase 2: Deeper discovery

Add interactive historical timelines, richer relationship exploration, publicly documented provenance, more collections, and location freshness management. Establish a useful initial timeline in Phase 1 if verified metadata makes it inexpensive.

### Phase 3: Intelligence and travel

Add photo identification, semantic search, image similarity, source-grounded AI explanations, synced accounts, city itineraries, and optional availability alerts. Introduce alerts only when an authorised, maintainable source supports updates.

Do not show non-working future features as active controls. Clearly distinguish a prototype, connected functionality, curated data, and roadmap items.

## 4. Signature feature: Artwork Family Explorer

Create a visual way to find the rest of an artwork's story across institutions.

Use the simple interface label **Related pieces**, with precise relationship labels underneath:

- Same series.
- Preparatory study for.
- Another version by the artist.
- Pendant or companion work.
- Part of the same multi-part work.
- Print impression from a defined edition.
- Cast associated with a defined model/edition.
- Copy after another artist.
- Documented influence or response.

Keep subject similarity and visual similarity in separate categories. Never infer membership in a series solely from matching titles or appearance.

Provide grid, comparison, and map views. Each piece should expose its title, creator attribution, date, relationship, holding collection, display status, and evidence source.

Candidate research themes include repeated subjects such as Sunflowers, Water Lilies, and studies connected to a finished painting. These are research leads, not verified seed records. Research each specific object and relationship before publishing it.

Never label a list complete unless a credible catalogue supports completeness. Prefer “12 documented pieces in our catalogue” over “all 12 pieces” when coverage is partial.

## 5. Other memorable experiences

### Why does this look familiar?

Offer related works grouped by same subject, technique, movement, documented influence, and visual similarity. Explain each recommendation in a short sentence. A machine-detected resemblance is not proof of historical influence.

### What else was happening then?

Show works made around the same time across regions and traditions, with filters by place and medium. Treat dates as ranges where necessary. Avoid presenting European period labels as a universal sequence for world art. Explain what geographic/cultural scope a movement label describes.

### Compare and understand

Compare two to four works on desktop and two comfortably on mobile. Include images, dates, materials, dimensions, related-piece labels, collections, and concise sourced differences. Preserve image aspect ratios and explain that screen sizes do not reflect physical scale. Add relative-size comparison only when dimensions are compatible and documented.

### My Art Passport

Let users save Want to see, Seen, and Want to understand; add private notes; filter saved works by city, artist, or style. A city page should surface relevant saved works and museum links. Do not guarantee future display or opening hours from historic records.

## 6. Pages and navigation

Primary navigation: Explore, Timeline, Map, My Art Passport. Keep search globally available.

### Homepage

Use a large, properly credited artwork image; a concise value proposition; search by artwork, artist, or description; an editorial related-piece story; and discovery cards for artists, styles, and places. Avoid invented visitor counts, reviews, and museum partnerships.

### Explore/search

Support title aliases, artist names, spelling tolerance where practical, and filters for creation date range, movement/style, medium, museum, city, and available display status. Preserve filters in the URL. Separate confirmed metadata from experimental semantic matches. Provide useful no-result suggestions.

### Artwork page

Organise into Overview, Understand, Related pieces, Where to see it, Journey, and Sources. Include title/alternate titles, artist attribution, creation date/range, medium, dimensions, accession number, institution, image credit, and rights. Begin with a short accessible explanation, then offer deeper detail.

### Artist page

Include sourced biography, lifespan where known, places worked, styles with context, selected works, related artists with explicit relationships, and museums holding documented works. Do not apply one style label to every work of a multi-period artist.

### Period/movement/style page

Explain the term, approximate dates and geography, characteristics, representative works, associated artists, overlapping traditions, and predecessor/successor connections where supported. Distinguish period, movement, technique, and style.

### Museum/city page

Show institution details, catalogue coverage, official visit link, artworks in our catalogue, and saved works. Show hours, ticket prices, gallery numbers, or exhibitions only from an appropriate current source, with freshness information.

### Ownership journey

Show documented ownership events separately from exhibition and loan events. Present missing intervals as gaps. Only show a collector's identity when publicly documented; do not infer identities or disclose private addresses. Never equate the last recorded auction buyer with a confirmed current owner.

## 7. Location and evidence rules

Separate the following concepts in both storage and interface:

- Legal/publicly documented owner.
- Holding or custodial institution.
- Permanent collection membership.
- Current physical location when published.
- Temporary loan/exhibition location and dates.
- Display status: on display, not on display, unconfirmed.
- Public access: museum/gallery access, appointment if officially published, private/no public access, unknown.

An institution owning a work does not establish that it is on display. A historic exhibition does not establish current location. Avoid placing a precise map pin for a private collection; a documented city-level label may be enough.

Store the original source statement, source URL, retrieval time, relevant effective date range, and verification status. Label stale location data and link users to the museum to check before visiting. Define a configurable freshness policy rather than inventing universal update guarantees.

Support uncertain dates, disputed attribution, anonymous artists, conflicting sources, missing images, destroyed/lost works, and unknown ownership. Do not turn uncertainty into exact values just to fill the interface.

## 8. Where to find data and content

These are starting points, not a claim that every source offers the same fields or unrestricted reuse. Open each official source and verify current access, coverage, authentication, pagination, limits, caching, attribution, and metadata/image rights before implementation. Preserve those findings in a source register.

| Source | Starting URL | Intended use | Integration instruction |
| --- | --- | --- | --- |
| The Met Collection API | https://metmuseum.github.io/ | Artwork metadata and collection links | Start with a narrow import; inspect actual available fields |
| The Met Open Access | https://www.metmuseum.org/hubs/open-access | Open-access policy and eligible images | Retain item-level image rights and credits |
| Art Institute of Chicago API | https://api.artic.edu/ | Public collection metadata and image references | Read the official schema and image instructions |
| Art Institute of Chicago Open Access | https://www.artic.edu/collection-information/open-access | Reuse policy | Do not assume every image is eligible |
| Europeana APIs | https://api.europeana.eu/ | Cross-institution discovery and source links | Verify key requirements and item-level rights; deduplicate originating records |
| Wikidata data access | https://www.wikidata.org/wiki/Wikidata:Data_access | Identifiers, aliases, and cross-links | Use as enrichment; verify important claims against originating records |
| Getty vocabularies | https://www.getty.edu/research/tools/vocabularies/ | Consistent terminology and entity reconciliation | Review the applicable vocabulary and release terms |
| Getty AAT | https://www.getty.edu/research/tools/vocabularies/aat/ | Art/style/material/technique terminology | Preserve authority identifiers and distinctions |
| Getty ULAN | https://www.getty.edu/research/tools/vocabularies/ulan/ | Artist names and biographical authority records | Help reconcile name variants; do not merge by name alone |
| Getty TGN | https://www.getty.edu/research/tools/vocabularies/tgn/ | Geographic authority records | Support historical and alternate place names |
| Getty Provenance Index | https://www.getty.edu/databases-tools-and-technologies/provenance/ | Historic ownership and market evidence | Investigate coverage and access; it is not a complete live ownership registry |
| Art UK | https://artuk.org/discover/artworks | UK collection research and collection links | Verify permitted access/reuse; do not assume a free bulk API |
| Official museum object/exhibition pages | Follow canonical links from records | Attribution, provenance, loans, display and visit information | Prefer the institution's published record for its own holdings |

For deeper explanations, research museum essays, scholarly catalogues, catalogues raisonnés where accessible, and institutional research publications. Link to supporting passages and write original concise summaries. Treat auction records as dated sale evidence, not automatically current location evidence.

For additional sources such as Wikimedia Commons or other museum open-access programmes, first locate and verify their official documentation and file-specific rights. Do not use image-search thumbnails as production assets. Do not use generated images as substitutes for actual artworks.

If access is unavailable, identify the exact missing capability and continue with permitted sources. Do not invent API endpoints or scrape around restrictions.

## 9. Data ingestion and editorial workflow

Build a small maintainable pipeline:

1. Source adapter retrieves a bounded batch with pagination, caching, retries, and rate-limit handling.
2. Retain permitted raw source records for traceability.
3. Normalise dates, dimensions, names, IDs, and institution references without losing original wording.
4. Reconcile entities using source IDs, accession IDs scoped to institution, and authority links.
5. Flag possible duplicates for review. Matching titles or identical-looking images are insufficient to merge physical objects.
6. Attach field-level assertions and sources.
7. Review sensitive or uncertain relationships, attribution, provenance, and image rights.
8. Publish approved records and search indexes.
9. Refresh changeable data separately from relatively stable art-history metadata.
10. Log sync failures, last success, missing rights, and stale records.

Provide an admin workflow to edit copy, approve relationships, compare conflicting assertions, correct records, and remove an ineligible image without deleting the artwork record. Keep source changes and editorial changes distinguishable.

## 10. Data model

Design entities for Artwork/PhysicalObject, Artist/Agent, Movement/Style/Period, Place, Institution, Collection, WorkGroup/Series, Edition/Model where needed, Relationship, OwnershipEvent, Exhibition/LoanEvent, LocationAssertion, ImageAsset, Source, Assertion, User, SavedArtwork, and Note.

Avoid overengineering the MVP, but preserve these distinctions:

- A named artistic work/concept may be associated with multiple physical impressions or casts.
- A physical object has its own identifiers, dimensions, condition/location history, and sources.
- A series contains distinct works; it is not an edition.
- A museum collection is an institutional grouping; it is not automatically an artistic series.

Relationships should have subject, predicate, object, evidence source, optional date range, review status, and explanation. Separate verified historical relationships from machine-generated suggestions.

Assertions should support multiple conflicting values, preferred display value, source, retrieval date, effective dates, and reason for editorial selection. Keep creation date display text alongside sortable earliest/latest values and precision. Do not discard approximate or disputed wording.

Images need source URL, credit, rights/license URL, eligible uses, dimensions, and alt text. Store private user notes separately from public art records.

## 11. AI behaviour

Use AI for source-grounded summaries, natural-language retrieval, candidate relationships, comparison assistance, and later photo identification.

Rules:

- Retrieve evidence before generating factual art-history or location answers.
- Cite the source supporting each substantive claim.
- Explicitly distinguish recorded facts, attributed interpretations, and model suggestions.
- Say when evidence is insufficient.
- Do not fabricate artists, dates, provenance, quotes, sources, or exhibition status.
- Never present an uploaded photo match as certain merely because it looks similar.
- Return ranked candidate objects with differentiating details; offer “none of these.”
- Use documented identifiers to resolve the final selected object.
- Do not display uncalibrated similarity scores as probability of correctness.
- For style analysis, explain observations and allow multiple plausible classifications.
- Provide text search even when AI services fail.
- If uploads are added, validate files, minimise retention, and explain their handling.

## 12. Visual direction and accessibility

Create a contemporary editorial museum experience: artwork-first, warm off-white background, dark readable text, restrained accent colour, generous spacing, and thoughtful typography. Pair an elegant heading face with a highly readable body face if available and licensed.

Preserve artwork aspect ratios; use intentional crops only for editorial previews and allow the full artwork view. Avoid excessive animation, glossy dashboard styling, or dense graph diagrams as the default experience. Make the connection graph optional; readable cards and lists must convey the same information.

Provide keyboard navigation, visible focus, meaningful alt text, adequate contrast, reduced-motion support, labelled controls, and accessible map/list alternatives. Never rely on colour alone for era or status. On mobile, keep search and saving easy, and avoid horizontal comparison layouts that hide essential context.

Every primary action needs a working destination and feedback. Design loading, unavailable image, offline/API failure, empty saved list, unknown location, and no-match states.

## 13. Technical approach

Choose a small maintainable stack suited to the available environment. A reasonable architecture is a responsive web frontend, a relational database with explicit relationship tables, background imports, and a search layer that starts with database text search. Add vector retrieval or a dedicated graph database only when a concrete need justifies it.

Document the stack choice before major implementation. Reuse existing project conventions. Verify current official documentation for chosen libraries rather than guessing APIs. Keep provider adapters replaceable. Keep API keys server-side.

Render public detail pages in a search-engine-friendly way, with stable canonical URLs and meaningful metadata. Optimise image sizes, lazy-load galleries, paginate results, and avoid fetching entire external catalogues during page loads. Ensure cache invalidation does not silently preserve outdated display information.

Keep the demo usable without optional credentials using a small permitted, verified seed dataset. If any illustrative placeholders are necessary, label them explicitly and exclude them from factual search results. Provide setup, environment-variable examples without secrets, migrations, seed/import commands, and a concise README.

## 14. Acceptance criteria

Before calling the MVP complete, demonstrate that:

- A user can search, filter, open a result, navigate to an artist, and return with filters preserved.
- Each published artwork has a stable identifier, a real supporting source, and an explicit rights state for its image.
- A related-piece story explains each relationship and can open a comparison and institution view.
- Physical objects with similar titles are not accidentally merged.
- Unknown display status remains unknown; holdings are never automatically marked on display.
- Saving and removing works functions and persists according to the chosen local/account mode.
- Pages work on mobile and with keyboard navigation.
- Failed external requests produce usable fallback states.
- AI-generated factual explanations have evidence and do not invent unknown values.
- There are no fake metrics, unsupported completeness claims, broken primary controls, or exposed credentials.

Use focused tests for object identity, date ranges, relationship types, display-status mapping, and saved-list persistence. Check real user flows and visual layouts. Report what was verified, what remains incomplete, and the actual dataset coverage.

## 15. Product success and longer-term business options

Measure whether users move from one artwork to a meaningful related work, save something, compare pieces, and follow a museum visit link. Track no-result searches and source/rights/location coverage to guide improvements. Avoid invasive tracking and distinguish engagement metrics from actual museum attendance.

Keep core discovery accessible. Potential later paid features include synced travel planning, advanced personal collections, or institution-facing tools. Do not introduce paywalls, affiliate recommendations, ticket sales, or sponsored rankings in the MVP without a separate product decision.

## 16. Required working deliverables

Work in this order:

1. Concise product definition, target users, assumptions, and differentiator.
2. Prioritised MVP scope and phased backlog.
3. Sitemap and core user journeys.
4. Visual direction and page/component specifications.
5. Verified source register: access method, useful fields, rights, coverage gaps, freshness, and integration priority.
6. Data model and source/uncertainty policy.
7. A working vertical slice: search → artwork → related piece → museum → save.
8. Broader implementation and curated content expansion.
9. Focused functional and visual verification.
10. Handoff with setup instructions, implemented features, known limitations, source coverage, and next actions.

For planning-only environments, deliver items 1–6 plus detailed implementation tasks and acceptance criteria for 7–10. For building environments, continue through the working implementation rather than stopping after the plan. Respect the environment's deployment rules and distinguish preview from published availability.

The finished experience should make someone think: **“I came to identify one artwork, discovered how it connects to others, and now know where I might see them.”**
