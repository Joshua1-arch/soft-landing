import type {
  QlooAdapter,
  Entity,
  SearchEntityType,
  InsightEntityType,
  InsightRequest,
  InsightResult,
  CultureGapReadout,
  CategoryGap,
  ExplainabilitySignal,
  DomainCategory,
} from "./types.ts";
import { sanitizeInsightsParams } from "./params.ts";
import { MockQlooAdapter } from "./mock.ts";
import { PERSONAS } from "./fixtures/personas.ts";

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class LiveQlooAdapter implements QlooAdapter {
  private baseUrl: string;
  private apiKey: string;
  private fallbackMock: MockQlooAdapter;
  private cache: Map<string, CacheEntry> = new Map();
  private lastRequestTime = 0;
  private minSpacingMs = 250; // Rate limit discipline (~5 req/s)
  private cacheTtlMs = 10 * 60 * 1000; // 10 minutes TTL

  constructor() {
    this.baseUrl = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
    this.apiKey = process.env.QLOO_API_KEY || "";
    this.fallbackMock = new MockQlooAdapter();
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minSpacingMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minSpacingMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private logFallback(endpoint: string, reason: string, details: Record<string, unknown>) {
    console.warn(`[qloo_fallback] ${endpoint} failed (${reason}), falling back to mock adapter.`, {
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  private async fetchWithRetry(url: string, attempt = 1): Promise<Response> {
    await this.enforceRateLimit();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "X-Api-Key": this.apiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Handle 429 rate limit with one retry after 800ms
      if (res.status === 429 && attempt === 1) {
        console.warn("[Qloo Live] 429 rate limit encountered. Retrying after 800ms backoff...");
        await new Promise((resolve) => setTimeout(resolve, 800));
        return this.fetchWithRetry(url, 2);
      }

      return res;
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async resolveEntities(query: string, types: SearchEntityType[], limit = 5): Promise<Entity[]> {
    if (!this.apiKey) {
      return this.fallbackMock.resolveEntities(query, types, limit);
    }

    const cacheKey = `search:${query}:${types.join(",")}:${limit}`;
    const cached = this.getCached<Entity[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      query,
      types: types.join(","),
      take: String(Math.min(limit, 50)),
    });

    const url = `${this.baseUrl}/search?${params.toString()}`;

    try {
      const res = await this.fetchWithRetry(url);
      if (!res.ok) {
        this.logFallback("GET /search", `HTTP ${res.status}`, { query, types });
        return this.fallbackMock.resolveEntities(query, types, limit);
      }

      const data = await res.json();
      // Confirmed: /search returns { results: [ { entity_id, name, types, tags, properties } ] }
      const rawEntities = Array.isArray(data) ? data : data.results || [];

      const entities: Entity[] = rawEntities.map((item: any) => {
        const rawTags = item.tags || [];
        const stringTags = Array.isArray(rawTags)
          ? rawTags.map((t: any) => (typeof t === "string" ? t : t.name || t.tag_id || ""))
          : [];

        return {
          id: item.entity_id || item.id,
          name: item.name || item.title || query,
          type: item.types?.[0] || item.type || types[0],
          category: "music",
          tags: stringTags.filter(Boolean),
          imageUrl: item.properties?.image?.url || item.properties?.images?.[0]?.url,
          locality: item.properties?.geocode?.city || item.properties?.locality || item.locality,
          subtitle: item.properties?.short_description || item.disambiguation,
        };
      });

      this.setCache(cacheKey, entities);
      return entities;
    } catch (err: any) {
      this.logFallback("GET /search", err.message, { query, types });
      return this.fallbackMock.resolveEntities(query, types, limit);
    }
  }

  async findTags(query: string, limit = 5): Promise<{ id: string; name: string }[]> {
    if (!this.apiKey) {
      return this.fallbackMock.findTags(query, limit);
    }

    const cacheKey = `tags:${query}:${limit}`;
    const cached = this.getCached<{ id: string; name: string }[]>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      "filter.query": query,
      take: String(Math.min(limit, 50)),
      "feature.typo_tolerance": "true",
    });

    const url = `${this.baseUrl}/v2/tags?${params.toString()}`;

    try {
      const res = await this.fetchWithRetry(url);
      if (!res.ok) {
        this.logFallback("GET /v2/tags", `HTTP ${res.status}`, { query });
        return this.fallbackMock.findTags(query, limit);
      }

      const data = await res.json();
      // Confirmed: /v2/tags returns { results: { tags: [ { id, name, type } ] } }
      const rawTags = data.results?.tags || data.tags || [];

      const tags = rawTags.map((t: any) => ({
        id: t.id || t.tag_id,
        name: t.name || t.tag,
      }));

      this.setCache(cacheKey, tags);
      return tags;
    } catch (err: any) {
      this.logFallback("GET /v2/tags", err.message, { query });
      return this.fallbackMock.findTags(query, limit);
    }
  }

  async insights(req: InsightRequest): Promise<InsightResult[]> {
    if (!this.apiKey) {
      return this.fallbackMock.insights(req);
    }

    const rawParamRecord: Record<string, any> = {
      "filter.type": req.filterType,
      take: req.take || 12,
      page: req.page || 1,
    };

    if (req.signalEntities && req.signalEntities.length > 0) {
      rawParamRecord["signal.interests.entities"] = req.signalEntities.join(",");
    }

    if (req.signalTags && req.signalTags.length > 0) {
      rawParamRecord["signal.interests.tags"] = req.signalTags.join(",");
    }

    if (req.locationQuery) {
      rawParamRecord["filter.location.query"] = req.locationQuery;
    }

    if (req.explainability) {
      rawParamRecord["feature.explainability"] = "true";
    }

    const { params } = sanitizeInsightsParams(req.filterType, rawParamRecord);
    const url = `${this.baseUrl}/v2/insights?${params.toString()}`;
    const cacheKey = `insights:${params.toString()}`;

    const cached = this.getCached<InsightResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.fetchWithRetry(url);
      if (!res.ok) {
        this.logFallback("GET /v2/insights", `HTTP ${res.status}`, { params: params.toString() });
        return this.fallbackMock.insights(req);
      }

      const data = await res.json();
      // Confirmed: /v2/insights returns { results: { entities: [ ... ] }, query: { explainability: ... } }
      const rawEntities = data.results?.entities || (Array.isArray(data.results) ? data.results : []);

      if (!rawEntities || rawEntities.length === 0) {
        this.logFallback("GET /v2/insights", "Empty entities array returned", { params: params.toString() });
        return this.fallbackMock.insights(req);
      }

      // Map category from filterType
      let domainCat: DomainCategory = "music";
      if (req.filterType === "urn:entity:place") domainCat = "places";
      else if (req.filterType === "urn:entity:movie" || req.filterType === "urn:entity:tv_show") domainCat = "film";
      else if (req.filterType === "urn:entity:book") domainCat = "books";
      else if (req.filterType === "urn:entity:podcast") domainCat = "podcasts";

      const affinities = rawEntities.map((r: any) => r.query?.affinity || r.affinity || 0.5);
      const minAff = Math.min(...affinities);
      const maxAff = Math.max(...affinities);

      const results: InsightResult[] = rawEntities.map((item: any, idx: number) => {
        const rawScore = affinities[idx];
        const fam = maxAff === minAff ? 0.5 : (rawScore - minAff) / (maxAff - minAff);
        let novelty = 1 - fam;
        if (item.properties?.geocode?.city || item.properties?.locality || item.locality) {
          novelty = Math.min(1.0, novelty + 0.10);
        }

        // Confirmed explainability structure: item.query.explainability["signal.interests.entities"]
        const explanation: ExplainabilitySignal[] = [];
        const expSignals = item.query?.explainability?.["signal.interests.entities"];

        if (Array.isArray(expSignals) && expSignals.length > 0) {
          for (const sig of expSignals.slice(0, 3)) {
            const rawScore = typeof item.query?.affinity === "number" ? item.query.affinity : sig.score;
            if (typeof rawScore === "number") {
              const scoreNum = Math.round(rawScore * 100) / 100;
              explanation.push({
                anchorName: "Taste Anchor",
                anchorId: sig.entity_id || `sig_${idx}`,
                score: scoreNum,
                reasonText: `Attributed to taste anchor — ${scoreNum}`,
              });
            }
          }
        }

        const rawTags = item.tags || [];
        const stringTags = Array.isArray(rawTags)
          ? rawTags.map((t: any) => (typeof t === "string" ? t : t.name || t.tag_id || ""))
          : [];

        const cityLoc = item.properties?.geocode?.city || item.properties?.address?.split(" ")[1] || req.locationQuery;

        const primGenre = item.properties?.primary_genre?.name || item.primary_genre?.name || item.primary_genre || "";
        const subType = item.subtype || item.properties?.subtype || "";
        const cuisineDesc = item.properties?.cuisine_description || "";

        return {
          entity: {
            id: item.entity_id || item.id || `live_${idx}`,
            name: item.name || item.title || "Cultural Pick",
            type: req.filterType,
            category: domainCat,
            tags: stringTags.filter(Boolean),
            imageUrl: item.properties?.image?.url || item.properties?.images?.[0]?.url,
            locality: cityLoc,
            subtitle: item.properties?.short_description || item.properties?.known_for || `${domainCat} in ${cityLoc || "your destination"}`,
            subtype: subType,
            primaryGenre: primGenre,
            cuisineDescription: cuisineDesc,
          },
          rawAffinity: rawScore,
          normalizedFamiliarity: Math.round(fam * 1000) / 1000,
          novelty: Math.round(novelty * 1000) / 1000,
          explanation: explanation.length > 0 ? explanation : undefined,
        };
      });

      this.setCache(cacheKey, results);
      return results;
    } catch (err: any) {
      this.logFallback("GET /v2/insights", err.message, { params: params.toString() });
      return this.fallbackMock.insights(req);
    }
  }

  private async resolvePersonaAnchor(personaId: string): Promise<{ id: string; name: string } | null> {
    const persona = PERSONAS[personaId] || PERSONAS.amara;

    // Direct mapping of known anchors for the 3 hackathon personas to guarantee resolution
    const preferredAnchors: Record<string, { query: string; type: SearchEntityType; name: string }> = {
      amara: { query: "Fela Kuti", type: "urn:entity:artist", name: "Fela Kuti" },
      dmitri: { query: "Antonio Carlos Jobim", type: "urn:entity:artist", name: "Antônio Carlos Jobim" },
      yuki: { query: "Haruki Murakami", type: "urn:entity:author", name: "Haruki Murakami" },
    };

    const pref = preferredAnchors[personaId];
    if (pref) {
      const resolved = await this.resolveEntities(pref.query, [pref.type], 1);
      if (resolved.length > 0 && resolved[0].id) {
        return { id: resolved[0].id, name: pref.name };
      }
    }

    // Dynamic resolution across all anchors
    const searchTypes: SearchEntityType[] = ["urn:entity:artist", "urn:entity:author", "urn:entity:movie", "urn:entity:book"];
    for (const anchor of persona.anchors) {
      const resolved = await this.resolveEntities(anchor, searchTypes, 1);
      if (resolved.length > 0 && resolved[0].id) {
        return { id: resolved[0].id, name: resolved[0].name };
      }
    }

    return null;
  }

  async getFullCandidatePool(personaId: string): Promise<InsightResult[]> {
    if (!this.apiKey) {
      return this.fallbackMock.getFullCandidatePool(personaId);
    }

    const persona = PERSONAS[personaId] || PERSONAS.amara;

    try {
      // 1. Resolve anchor to real Qloo entity ID
      const anchor = await this.resolvePersonaAnchor(personaId);
      if (!anchor) {
        this.logFallback("getFullCandidatePool", "Anchor resolution returned empty", { personaId });
        return this.fallbackMock.getFullCandidatePool(personaId);
      }

      const destCity = persona.destination.split(",")[0].trim();

      // 2. Fetch live insights across all domains in parallel
      const [music, placesRaw, films, books, podcasts] = await Promise.all([
        this.insights({
          filterType: "urn:entity:artist",
          signalEntities: [anchor.id],
          explainability: true,
          take: 12,
        }),
        this.insights({
          filterType: "urn:entity:place",
          signalEntities: [anchor.id],
          locationQuery: destCity,
          explainability: true,
          take: 40,
        }),
        this.insights({
          filterType: "urn:entity:movie",
          signalEntities: [anchor.id],
          explainability: true,
          take: 10,
        }),
        this.insights({
          filterType: "urn:entity:book",
          signalEntities: [anchor.id],
          explainability: true,
          take: 8,
        }),
        this.insights({
          filterType: "urn:entity:podcast",
          signalEntities: [anchor.id],
          explainability: true,
          take: 8,
        }),
      ]);

      // 3. Partition places into food vs physical spaces using strict dining venue classification
      const foodItems: InsightResult[] = [];
      const placeItems: InsightResult[] = [];

      for (const item of placesRaw) {
        if (LiveQlooAdapter.isDiningPlace(item) || LiveQlooAdapter.isDiningPlace(item.entity)) {
          foodItems.push({
            ...item,
            entity: {
              ...item.entity,
              category: "food",
              subtitle: item.entity.subtitle || `Food & dining in ${destCity}`,
            },
          });
        } else {
          placeItems.push({
            ...item,
            entity: {
              ...item.entity,
              category: "places",
              subtitle: item.entity.subtitle || `Cultural landmark in ${destCity}`,
            },
          });
        }
      }

      // Enhance explainability labels with anchor name
      const annotateExplanation = (items: InsightResult[]): InsightResult[] => {
        return items.map((it) => {
          if (it.explanation && it.explanation.length > 0) {
            return {
              ...it,
              explanation: it.explanation.map((exp) => ({
                ...exp,
                anchorName: anchor.name,
                reasonText: `100% of match traces to ${anchor.name}`,
              })),
            };
          }
          return it;
        });
      };

      const liveCombined: InsightResult[] = [
        ...annotateExplanation(music),
        ...annotateExplanation(foodItems),
        ...annotateExplanation(placeItems),
        ...annotateExplanation(films),
        ...annotateExplanation(books),
        ...annotateExplanation(podcasts),
      ];

      // If live returns at least 30 items, return pure live candidate pool
      if (liveCombined.length >= 30) {
        return liveCombined;
      }

      this.logFallback("getFullCandidatePool", `Sparse live items (${liveCombined.length})`, { personaId });
      return this.fallbackMock.getFullCandidatePool(personaId);
    } catch (err: any) {
      this.logFallback("getFullCandidatePool", err.message, { personaId });
      return this.fallbackMock.getFullCandidatePool(personaId);
    }
  }

  // Strict food vs place classifier: ensures general attractions, museums, and landmarks are never labeled food
  static isDiningPlace(input: any): boolean {
    if (!input) return false;
    const entity = input.entity || input;
    const properties = input.properties || entity.properties || {};

    const genre = (
      entity.primaryGenre ||
      properties.primary_genre?.name ||
      properties.primary_genre ||
      ""
    ).toLowerCase().trim();

    const subtype = (
      entity.subtype ||
      properties.subtype ||
      input.subtype ||
      ""
    ).toLowerCase().trim();

    // 1. Explicit non-food exclusions (museums, landmarks, university halls, airports, etc.)
    const nonFoodGenres = [
      "tourist attraction", "television tower", "observation deck", "vista point",
      "monument", "historic site", "historical place", "city hall",
      "art museum", "museum", "art gallery", "cultural center",
      "performing arts theater", "auditorium", "opera company", "arts organization",
      "college", "university library", "rare book store", "academic department",
      "academic institution", "school", "university",
      "church", "presbyterian church", "cathedral", "mosque", "temple", "synagogue",
      "apartment complex", "residential building", "condominium",
      "international airport", "airport", "bridge", "island", "park", "beach",
      "clothing store", "record store", "book store", "shopping mall", "gym", "fitness center"
    ];

    if (nonFoodGenres.some((nfg) => genre.includes(nfg) || subtype.includes(nfg))) {
      return false;
    }

    // 2. Explicit dining genres
    const diningGenres = [
      "restaurant", "cafe", "coffee shop", "coffee", "bar", "pub", "brewery",
      "sake brewery", "pizzeria", "ice cream shop", "ice cream", "bakery",
      "bistro", "diner", "food hall", "eatery", "gastropub", "delicatessen",
      "teahouse", "cocktail bar", "wine bar", "izakaya", "udon", "noodle",
      "ramen", "sushi", "obanzai", "takoyaki", "tempura", "teppanyaki",
      "syokudo", "teishoku", "kaiseki", "takeaway", "boulangerie", "patisserie",
      "tapas", "taqueria", "churrascaria"
    ];

    if (diningGenres.some((dg) => genre.includes(dg) || subtype.includes(dg))) {
      return true;
    }

    // 3. Check cuisine description or menu URL (corroborates genuine dining venue)
    const hasCuisineDesc = Boolean(entity.cuisineDescription || properties.cuisine_description);
    const hasMenu = Boolean(properties.menu_url);
    if ((hasCuisineDesc || hasMenu) && genre && !nonFoodGenres.some((nfg) => genre.includes(nfg))) {
      return true;
    }

    // 4. Tag check: must have a dining-specific tag (word boundary check to prevent substring collisions)
    const rawTags = entity.tags || properties.tags || input.tags || [];
    const tags = Array.isArray(rawTags)
      ? rawTags.map((t: any) => (typeof t === "string" ? t : t.name || t.id || "").toLowerCase())
      : [];

    const foodKeywords = [
      "restaurant", "cafe", "coffee", "bakery", "bar", "pub", "bistro",
      "eatery", "diner", "dining", "brewery", "takeaway", "brunch", "ramen",
      "sushi", "pizza", "gelato", "ice cream", "food hall"
    ];

    const hasFoodTag = tags.some((tagStr) => {
      return foodKeywords.some((kw) => {
        const regex = new RegExp(`(^|\\s|[^a-z0-9])${kw}($|\\s|[^a-z0-9])`, "i");
        return regex.test(tagStr);
      });
    });

    return hasFoodTag;
  }

  // Specificity-weighted tag overlap formula: specific tags = 1.0, generic catch-alls = 0.25, max 5 tags evaluated
  static computeOverlapFromTags(tags: Array<{ name?: string; subtype?: string }>): { overlap: number; hasData: boolean } {
    if (!tags || tags.length === 0) return { overlap: 0.0, hasData: false };
    const genericTags = new Set(["place", "tourist attraction", "destination", "point of interest", "establishment"]);
    let scoreSum = 0;
    const evaluatedTags = tags.slice(0, 5);
    for (const t of evaluatedTags) {
      const name = (t.name || "").toLowerCase().trim();
      const isGeneric = genericTags.has(name) || t.subtype === "urn:tag:genre:place";
      const specificity = isGeneric ? 0.25 : 1.0;
      scoreSum += specificity;
    }
    const overlap = Math.min(1.0, Math.round((scoreSum / 5) * 100) / 100);
    return { overlap, hasData: true };
  }

  async computeCultureGap(origin: string, destination: string, anchors: string[]): Promise<CultureGapReadout> {
    if (!this.apiKey) {
      return this.fallbackMock.computeCultureGap(origin, destination, anchors);
    }

    const originCity = origin.split(",")[0].trim();
    const destCity = destination.split(",")[0].trim();

    try {
      // Per-persona or dynamic representative entities across all 6 domains
      const personaReps: Record<
        string,
        Record<DomainCategory, { type: SearchEntityType; originSearch: string; destSearch: string }>
      > = {
        amara: {
          music: { type: "urn:entity:artist", originSearch: "Fela Kuti", destSearch: "Oasis" },
          food: { type: "urn:entity:place", originSearch: "Terra Kulture", destSearch: "Spice World" },
          film: { type: "urn:entity:movie", originSearch: "Lionheart", destSearch: "Manchester by the Sea" },
          books: { type: "urn:entity:book", originSearch: "Things Fall Apart", destSearch: "Mary Barton" },
          podcasts: { type: "urn:entity:podcast", originSearch: "Intelligence Matters", destSearch: "Manchester United Podcast" },
          places: { type: "urn:entity:place", originSearch: "Lagos", destSearch: "Manchester" },
        },
        dmitri: {
          music: { type: "urn:entity:artist", originSearch: "Antonio Carlos Jobim", destSearch: "Kyoto Jazz Massive" },
          food: { type: "urn:entity:place", originSearch: "Churrascaria Palace", destSearch: "Gion Kappa Restaurant" },
          film: { type: "urn:entity:movie", originSearch: "City of God", destSearch: "Rashomon" },
          books: { type: "urn:entity:book", originSearch: "The Hour of the Star", destSearch: "The Old Capital" },
          podcasts: { type: "urn:entity:podcast", originSearch: "Brazilian", destSearch: "Kyoto" },
          places: { type: "urn:entity:place", originSearch: "Rio de Janeiro", destSearch: "Kyoto" },
        },
        yuki: {
          music: { type: "urn:entity:artist", originSearch: "Ryuichi Sakamoto", destSearch: "Glenn Gould" },
          food: { type: "urn:entity:place", originSearch: "Sukiyabashi Jiro", destSearch: "Burwash Dining Hall" },
          film: { type: "urn:entity:movie", originSearch: "Drive My Car", destSearch: "Scott Pilgrim vs. the World" },
          books: { type: "urn:entity:book", originSearch: "Norwegian Wood", destSearch: "The Handmaid's Tale" },
          podcasts: { type: "urn:entity:podcast", originSearch: "Tokyo Tales", destSearch: "Locked On Raptors" },
          places: { type: "urn:entity:place", originSearch: "Tokyo", destSearch: "Toronto" },
        },
      };

      // Match known persona or construct dynamic representative pairs
      const matchedKey =
        originCity.toLowerCase().includes("lagos") || destCity.toLowerCase().includes("manchester")
          ? "amara"
          : originCity.toLowerCase().includes("paulo") || destCity.toLowerCase().includes("lisbon")
          ? "dmitri"
          : originCity.toLowerCase().includes("osaka") || destCity.toLowerCase().includes("toronto")
          ? "yuki"
          : null;

      const domainConfigs: Record<DomainCategory, { label: string; type: SearchEntityType; originSearch: string; destSearch: string }> = {
        music: {
          label: "Music",
          type: "urn:entity:artist",
          originSearch: matchedKey ? personaReps[matchedKey].music.originSearch : anchors[0] || originCity,
          destSearch: matchedKey ? personaReps[matchedKey].music.destSearch : destCity,
        },
        food: {
          label: "Food",
          type: "urn:entity:place",
          originSearch: matchedKey ? personaReps[matchedKey].food.originSearch : `${originCity} Dining`,
          destSearch: matchedKey ? personaReps[matchedKey].food.destSearch : `${destCity} Dining`,
        },
        film: {
          label: "Film & TV",
          type: "urn:entity:movie",
          originSearch: matchedKey ? personaReps[matchedKey].film.originSearch : originCity,
          destSearch: matchedKey ? personaReps[matchedKey].film.destSearch : destCity,
        },
        books: {
          label: "Books",
          type: "urn:entity:book",
          originSearch: matchedKey ? personaReps[matchedKey].books.originSearch : originCity,
          destSearch: matchedKey ? personaReps[matchedKey].books.destSearch : destCity,
        },
        podcasts: {
          label: "Podcasts",
          type: "urn:entity:podcast",
          originSearch: matchedKey ? personaReps[matchedKey].podcasts.originSearch : originCity,
          destSearch: matchedKey ? personaReps[matchedKey].podcasts.destSearch : destCity,
        },
        places: {
          label: "Places",
          type: "urn:entity:place",
          originSearch: matchedKey ? personaReps[matchedKey].places.originSearch : originCity,
          destSearch: matchedKey ? personaReps[matchedKey].places.destSearch : destCity,
        },
      };

      const categories: DomainCategory[] = ["music", "food", "film", "books", "podcasts", "places"];

      const compareDomain = async (cat: DomainCategory): Promise<CategoryGap> => {
        const cfg = domainConfigs[cat];
        try {
          const [originEntities, destEntities] = await Promise.all([
            this.resolveEntities(cfg.originSearch, [cfg.type], 1),
            this.resolveEntities(cfg.destSearch, [cfg.type], 1),
          ]);

          const idA = originEntities[0]?.id;
          const idB = destEntities[0]?.id;

          if (!idA || !idB) {
            return {
              category: cat,
              label: cfg.label,
              overlap: 0.0,
              verdict: `Not enough comparative data for ${cfg.label.toLowerCase()} in ${destCity}`,
              level: "steep",
              hasData: false,
            };
          }

          const sp = new URLSearchParams({
            "a.signal.interests.entities": idA,
            "b.signal.interests.entities": idB,
            "filter.type": cfg.type,
            take: "5",
          });
          const url = `${this.baseUrl}/v2/analysis/compare?${sp.toString()}`;
          const res = await this.fetchWithRetry(url);
          if (!res.ok) {
            return {
              category: cat,
              label: cfg.label,
              overlap: 0.0,
              verdict: `Not enough comparative data for ${cfg.label.toLowerCase()} in ${destCity}`,
              level: "steep",
              hasData: false,
            };
          }

          const data = await res.json();
          const tags = data.results?.tags || [];
          const { overlap, hasData } = LiveQlooAdapter.computeOverlapFromTags(tags);

          if (!hasData) {
            return {
              category: cat,
              label: cfg.label,
              overlap: 0.0,
              verdict: `Not enough comparative data for ${cfg.label.toLowerCase()} in ${destCity}`,
              level: "steep",
              hasData: false,
            };
          }

          const verdict =
            overlap >= 0.6
              ? `Your ${cfg.label.toLowerCase()} taste connects strongly with ${destCity}`
              : overlap >= 0.35
              ? `Moderate alignment; familiar entry points alongside new local styles`
              : `Distinct ${cfg.label.toLowerCase()} landscape in ${destCity} requiring deliberate exploration`;

          const level = overlap >= 0.6 ? "easy" : overlap >= 0.35 ? "moderate" : "steep";

          return {
            category: cat,
            label: cfg.label,
            overlap,
            verdict,
            level,
            hasData: true,
          };
        } catch {
          return {
            category: cat,
            label: cfg.label,
            overlap: 0.0,
            verdict: `Not enough comparative data for ${cfg.label.toLowerCase()} in ${destCity}`,
            level: "steep",
            hasData: false,
          };
        }
      };

      const breakdown: CategoryGap[] = await Promise.all(categories.map((c) => compareDomain(c)));

      const overall =
        breakdown.length > 0
          ? Math.round((breakdown.reduce((acc: number, b: CategoryGap) => acc + b.overlap, 0) / breakdown.length) * 100) / 100
          : 0.0;

      return {
        originCity,
        destinationCity: destCity,
        overallOverlap: overall,
        summarySentence: `Evaluated across your taste anchors and ${destCity}'s cultural landscape via Qloo Taste Graph.`,
        breakdown,
      };
    } catch (err: any) {
      this.logFallback("computeCultureGap", err.message, { origin, destination });
      return this.fallbackMock.computeCultureGap(origin, destination, anchors);
    }
  }
}
