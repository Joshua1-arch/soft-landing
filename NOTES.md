# Qloo API — Verified Surface (NOTES.md)

Confidence labels: [documented] read in docs.qloo.com · [confirmed] one real 200 with
data from our key · [corrected] docs contradicted an earlier assumption.
Nothing is [confirmed] until QLOO_API_KEY is set and a call has returned real data.

## 1. Network & auth
- Base URL https://hackathon.api.qloo.com — env QLOO_BASE_URL, default to it. [confirmed]
- Hackathon keys 401 on staging.api.qloo.com and api.qloo.com. [documented]
- Header X-Api-Key: process.env.QLOO_API_KEY. Never Bearer, never a query param. [confirmed]
- GET + URLSearchParams. No JSON bodies. POST fails "No path matching request parameters". [confirmed]
- Server-side only: app/api/* route handlers. Key never in client bundle, log line,
  fixture, test, README, or error message. [policy]
- Caching: in-memory Map, 10-min TTL, per process. Never on disk, never in git. [confirmed]
- Rate limit ~5 req/s. Client queues calls at >=250ms spacing; 429 → one retry after 800ms → surface error. [confirmed]

## 2. Endpoints

### GET /search — entity resolution
- Params: query (string), types (plural, comma-separated), take, page. [confirmed]
- CORRECTED: the param is `types`, not `type`. [corrected]
- CORRECTED: `urn:entity:genre` does NOT exist in `/search` (returned 400 Bad Request: "urn:entity:genre is not supported"); genres are tags (`urn:tag`). [corrected]
- Supported `/search` types: urn:entity:actor, album, artist, author, book, brand, destination, director, locality, movie, person, place, podcast, tv_show, videogame, urn:demographics, urn:tag. [confirmed]
- Response: `{ results: [ { entity_id, name, types, properties: { image: { url }, short_description }, popularity, disambiguation, tags } ] }`. [confirmed]

### GET /v2/tags — tag IDs
- Params: **filter.query** (string), take, page, feature.typo_tolerance=true. [confirmed]
- CORRECTED: the param is `filter.query`, not `query`. [corrected]
- Response: `{ results: { tags: [ { tag_id, name, type, value, entity_id } ] } }`. [confirmed]

### GET /v2/insights — the main endpoint
- Params used:
  - filter.type — required, confirmed with: urn:entity:artist, urn:entity:place, urn:entity:movie, urn:entity:book, urn:entity:podcast, urn:entity:tv_show. [confirmed]
    Not urn:entity:music (403). Dining = urn:entity:place or urn:entity:brand. [confirmed]
  - signal.interests.entities — comma-separated entity IDs from /search. [confirmed]
  - signal.interests.tags — tag IDs from /v2/tags. [documented]
  - filter.location.query — fuzzy locality NAME for scoping (places etc). Successfully resolves "Manchester", "Toronto", "Lisbon". [confirmed]
  - feature.explainability=true. [confirmed]
  - take (default 20, max 50), page (1-100). [confirmed]
- CORRECTED: Response `results` is `{ entities: [ ... ] }` (an object containing an entities array, NOT an array directly). [corrected]
- Invalid params for the chosen filter.type are SILENTLY IGNORED → 200 with empty entities. [confirmed]

### Explainability response shape — [CONFIRMED ON LIVE CALLS]
- Per-entity explainability:
  `entity.query.explainability["signal.interests.entities"]` is an array:
  `[ { entity_id: string, score: number } ]`. [confirmed]
- Query-level explainability:
  `response.query.explainability["signal.interests.entities"]` is an object:
  `{ effect_on_top3_recs: [ { entity_id, avg_score } ], effect_on_top5_recs: [...], effect_on_top10_recs: [...], effect_on_all_recs: [...] }`. [confirmed]
- Raw affinity: located at `entity.query.affinity`. [confirmed]
- WhyPanel displays real attribution values without fabricating numbers; displays "Why: similar audience affinity in destination metro" when explainability signals are absent. [confirmed]

### GET /v2/analysis/compare — cultural gap
- Params: a.signal.interests.entities (required), b.signal.interests.entities (required), filter.type=urn:entity:artist, take=5. [confirmed]
- Response: `{ results: { tags: [ { tag_id, name, query: { score: number, "a.signal.interests.entities": [...], "b.signal.interests.entities": [...] } } ] } }`. [confirmed]
- Overlap computation: average of `query.score` across shared tags, normalised 0.0 to 1.0, labelled "computed" in UI and README. [confirmed]

### GET /v2/trending — [unverified] path and params to confirm before use.

## 3. Per-type parameter discipline
- Reference: https://docs.qloo.com/reference/available-parameters-by-entity-type
- lib/qloo/params.ts holds a supported-param set per filter.type; every insights request runs through sanitizeInsightsParams() which strips unsupported params and returns { params, removed }. [confirmed]

## 4. Failure behaviour
- Timeout 8s per call. 429 → one 800ms retry. Any other failure: fall back to mock and show banner: "Showing demo data — live Qloo API key is unset or operating in mock fallback." [confirmed]
- Server logs qloo_fallback with the reason and the sanitised request (no key). [confirmed]
- Fallback is never silent, and never reported as success. [confirmed]

## 6. Food vs Places Live Classification — [CONFIRMED ON LIVE CALLS]
- Query: `filter.type: "urn:entity:place"` returns both physical landmarks and dining establishments under the same entity type.
- Discriminator: `properties.primary_genre.name` is the authoritative field distinguishing dining venues from tourist attractions:
  - Verified Dining Primary Genres:
    - `Restaurant` (e.g. Burwash Dining Hall, Lambretta Pizzeria, The Dorset, Waterworks Food Hall)
    - `Cafe` (e.g. Communist's Daughter)
    - `Coffee shop` (e.g. Library Coffee)
    - `Bar` (e.g. Paris Texas, Gorilla, Night & Day Cafe)
    - `Pub` (e.g. The Absinthe Pub and Coffee Shop)
    - `Sake brewery` / `Brewery` (e.g. IZUMI Brewery)
    - `Ice cream shop` (e.g. On Third Thought)
    - `Izakaya restaurant`, `Udon noodle restaurant`, `Obanzai restaurant`, `Teppanyaki restaurant` (confirmed in Kyoto)
    - `Indian takeaway` (confirmed in Manchester)
  - Verified Non-Food Primary Genres (Strictly Excluded from Food):
    - `Television tower` / `Tourist attraction` / `Observation deck` (e.g. CN Tower, The Top CN Tower)
    - `Art museum` / `Museum` / `Art gallery` (e.g. Museum of Contemporary Art, Bata Shoe Museum, Gallery 1313, The Power Plant)
    - `College` / `University library` / `Rare book store` (e.g. University of St. Michael's College, Thomas Fisher Library, The Monkey's Paw)
    - `Historical place` (e.g. Gooderham Building)
    - `Auditorium` / `Performing arts theater` / `Opera company` (e.g. Convocation Hall, St. Lawrence Centre, Canadian Opera Company)
    - `City Hall`, `Presbyterian church`, `Apartment complex`, `International airport`, `Bridge`, `Island`, `Park`, `Beach`, `Clothing store`
- Dining Tag Signals: Subtypes or tags with `restaurant`, `cafe`, `coffee`, `bakery`, `bar`, `pub`, `bistro`, `eatery`, `diner`, `dining`, `brewery`, `takeaway`, `lunch`, `brunch`, `ramen`, `sushi`, `pizza`, `gelato`.
- Tag Substring Hazard: Concatenated substring matching on `"bar"` matches `"Wheelchair accessible parking lot"`. Matching must use whole-word regex or exact set membership.
- Shortfall Policy: If fewer dining picks exist in a metro, never pad with landmarks. Food slots schedule genuine dining venues, while non-food venues remain in "places".

## 7. Culture-Gap Overlap Arithmetic Breakdown (Zero Magic Multipliers)
- Reframe: The readout evaluates "How well does your taste connect to [destination]?" per category.
- Architecture: 6 independent, real Qloo `/v2/analysis/compare` calls — one per category:
  1. Music: `originArtist` vs `destArtist` (`urn:entity:artist`)
  2. Food: `originDining` vs `destDining` (`urn:entity:place`)
  3. Film: `originMovie` vs `destMovie` (`urn:entity:movie`)
  4. Books: `originBook` vs `destBook` (`urn:entity:book`)
  5. Podcasts: `originPodcast` vs `destPodcast` (`urn:entity:podcast`)
  6. Places: `originPlace` vs `destPlace` (`urn:entity:place`)
- Overlap Formula per Category:
  $$\text{Overlap} = \min\left(1.0, \frac{\sum_{i=1}^{\min(5, N)} \text{specificity}_i}{5}\right)$$
  - Specific tags (`genre`, `instrument`, `character`, `theme`, `content`, `flavor`, etc.): weight = 1.0.
  - Generic catch-all tags (`place`, `tourist attraction`, `point of interest`, `establishment`): weight = 0.25.
- If compare returns 0 tags or entity is missing $\rightarrow$ `overlap = 0.0` and flagged `hasData: false` ("Not enough data" in UI). Never substitutes a fallback constant or multiplier.
- Real Amara (Manchester) Live Breakdown:
  - Music (Fela Kuti vs Oasis): 5 specific tags (`Drums`, `Folk`, `Jazz`, `Blues`, `Ragtime`) $\rightarrow (1.0 \times 5) / 5 = \mathbf{1.00}$.
  - Food (Terra Kulture vs Spice World): 1 specific tag (`Restaurant` [category:place]) + 2 generic tags (`Place`, `Restaurant` [genre:place]) $\rightarrow (1.0 + 0.25 + 0.25) / 5 = 1.50 / 5 = \mathbf{0.30}$.
  - Film & TV (Lionheart vs Manchester by the Sea): 4 specific tags (`Drama`, `Resilient`, `Drama` [qloo], `Redemption`) $\rightarrow (1.0 \times 4) / 5 = \mathbf{0.80}$.
  - Books (Things Fall Apart vs Mary Barton): 5 specific tags (`Fiction`, `Classics`, `Literature`, `Historical Fiction`, `Novels`) $\rightarrow (1.0 \times 5) / 5 = \mathbf{1.00}$.
  - Podcasts (Intelligence Matters vs Manchester United Podcast): 4 specific tags (`News`, `Podcasts`, `Informative`, `Professional`) $\rightarrow (1.0 \times 4) / 5 = \mathbf{0.80}$.
  - Places (Lagos vs Manchester): 2 generic tags (`Place`, `Tourist Attraction`) $\rightarrow (0.25 + 0.25) / 5 = 0.50 / 5 = \mathbf{0.10}$.
- Overall Overlap: Arithmetic mean across all 6 categories:
  $$\frac{1.00 + 0.30 + 0.80 + 1.00 + 0.80 + 0.10}{6} = \frac{4.00}{6} = \mathbf{0.67} \quad (67\%)$$
- Zero cross-domain multipliers (`×0.70`, `×0.80`, `×1.50`, `×0.65` removed completely). Every single number is directly traceable to tags in live API responses.
