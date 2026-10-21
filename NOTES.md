# Qloo API — Verified Surface (NOTES.md)

Confidence labels: [documented] read in docs.qloo.com · [confirmed] one real 200 with
data from our key · [corrected] docs contradicted an earlier assumption.
Nothing is [confirmed] until QLOO_API_KEY is set and a call has returned real data.

## 1. Network & auth
- Base URL https://hackathon.api.qloo.com — env QLOO_BASE_URL, default to it. [documented]
- Hackathon keys 401 on staging.api.qloo.com and api.qloo.com. [documented]
- Header X-Api-Key: process.env.QLOO_API_KEY. Never Bearer, never a query param. [documented]
- GET + URLSearchParams. No JSON bodies. POST fails "No path matching request parameters". [documented]
- Server-side only: app/api/* route handlers. Key never in client bundle, log line,
  fixture, test, README, or error message. [policy]
- Caching: in-memory Map, 10-min TTL, per process. Never on disk, never in git. [documented: private server-side caching is permitted with no time limit; public-repo storage is not]
- Rate limit ~5 req/s [unverified — read "Quotas, Limits & Key Expiration"].
  Client queues calls at >=250ms spacing; 429 → one retry after 800ms → surface error.

## 2. Endpoints

### GET /search — entity resolution
- Params: query (string), types (plural, comma-separated), take, page. [documented]
- CORRECTED: the param is `types`, not `type`.
- CRITICAL: /search types != /v2/insights filter.type. Search-only values include
  urn:entity:locality; video games are urn:entity:videogame in search but
  urn:entity:video_game in insights. Keep two separate TS union types. [documented]
- Response: entities with entity_id, name, subtype, properties, tags. [documented]

### GET /v2/tags — tag IDs
- Params: **filter.query** (string), take, page, filter.tag.types,
  feature.typo_tolerance=true, feature.semantic_search=true (beta). [documented]
- CORRECTED: the param is `filter.query`, not `query`.
- Tags must be real IDs from here before use in signal.interests.tags / filter.tags. [documented]

### GET /v2/insights — the main endpoint
- Params used:
  - filter.type — required, one of: urn:entity:artist, book, brand, destination,
    movie, person, place, podcast, tv_show, video_game. [documented]
    Not urn:entity:music (403). Dining = urn:entity:place or urn:entity:brand. [documented]
  - signal.interests.entities — comma-separated entity IDs from /search. [documented]
  - signal.interests.tags — tag IDs from /v2/tags. [documented]
  - signal.demographics.age / .audiences — documented values only. [documented]
  - filter.tags, filter.price_level.max, filter.content_rating — constraint filters. [documented]
  - filter.location.query — fuzzy locality NAME for scoping (places etc). [documented]
    filter.location (resolved ID), filter.location.radius (m, <=800000, default 15000,
    0 = strict boundary). [documented]
    CORRECTED: there is no properties.geocode.city filter; properties.geocode.* is
    response data only.
  - filter.release_year.min/max (movie, tv_show), filter.publication_year.* (book),
    filter.date_of_birth.min/max (person), filter.release_country (tv_show). [documented]
    urn:entity:artist has NO release-year filter — era work uses urn:entity:person. [documented]
  - filter.results.entities — restrict output to a known set. [documented]
  - feature.explainability=true. [documented]
  - take (default 20, max 50), page (1-100), offset. [documented]
- At least one valid signal or filter is required; filter.type alone returns 400. [documented]
- Invalid params for the chosen filter.type are SILENTLY IGNORED → 200 with empty
  entities. Suspect parameter names before suspecting data. [documented]

### Explainability response shape — [TO CONFIRM ON FIRST LIVE CALL]
- Not results[].explanation. Believed: top-level query.explainability =
  { "<signal name>": [ { entity_id, score } ] }, plus per-entity query with
  affinity and measurements. [documented in outline, nesting unconfirmed]
- Action: on the first live call, console.log the raw JSON once, adapt the TS type to
  reality, mark [confirmed] here, and only then wire WhyPanel. Never fabricate a
  contribution number.

### GET /v2/analysis/compare — cultural gap
- Params: a.signal.interests.entities (required, array),
  b.signal.interests.entities (required, array), filter.type,
  filter.location.query, filter.entities.query, filter.subtype, model
  (descriptive|predictive), page (1-100), take (1-50), offset. [documented, from the
  Analysis Compare reference page]
- Takes two groups of ENTITY IDs, not place names. The culture-gap number is our
  construction: build group A from the user's resolved anchors, group B from a
  destination-scoped insights call (filter.location.query), then compare per category.
  Compute overlap from the returned shared tags; normalise 0-1 ourselves; label it
  "computed" in UI and README, never as a figure Qloo returned.

### GET /v2/trending — [unverified] path and params to confirm before use.

## 3. Per-type parameter discipline
- Reference: https://docs.qloo.com/reference/available-parameters-by-entity-type
- lib/qloo/params.ts holds a supported-param set per filter.type; every insights request
  runs through sanitizeInsightsParams() which strips unsupported params and returns
  { params, removed }. Removed params go to the debug trace and a console.warn in dev.

## 4. Failure behaviour
- Timeout 8s per call. 429 → one 800ms retry. Any other failure: fall back to mock and
  show a mandatory unmissable banner: "Showing demo data — live data unavailable."
- Server logs qloo_fallback with the reason and the sanitised request (no key).
- Fallback is never silent, and never reported as success.

## 5. Open questions for the first live session
1. Exact explainability nesting — log one raw response.
2. Whether filter.location.query resolves "Manchester" and "Lagos".
3. Real rate limit; real per-day quota.
4. Whether urn:entity:podcast returns usable volume in the hackathon environment.
5. Whether compare accepts a locality ID inside a.signal.interests.entities.
