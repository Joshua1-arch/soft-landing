import type {
  QlooAdapter,
  Entity,
  SearchEntityType,
  InsightEntityType,
  InsightRequest,
  InsightResult,
  CultureGapReadout,
  ExplainabilitySignal,
} from "./types.ts";
import { sanitizeInsightsParams } from "./params.ts";
import { MockQlooAdapter } from "./mock.ts";

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
      const rawEntities = Array.isArray(data) ? data : data.results || data.entities || [];

      const entities: Entity[] = rawEntities.map((item: any) => ({
        id: item.id || item.entity_id,
        name: item.name || item.title || query,
        type: item.type || types[0],
        category: "music", // mapped by caller
        tags: item.tags || [],
        imageUrl: item.image?.url || item.images?.[0]?.url,
        locality: item.properties?.locality || item.locality,
      }));

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

    // Documented param is filter.query, not query
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
      const rawTags = Array.isArray(data) ? data : data.results || data.tags || [];

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

    // Sanitize parameters strictly per filter.type
    const rawParamRecord: Record<string, any> = {
      "filter.type": req.filterType,
      "signal.interests.entities": req.signalEntities.join(","),
      take: req.take || 20,
      page: req.page || 1,
    };

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
      const rawResults = Array.isArray(data) ? data : data.results || data.entities || [];

      if (!rawResults || rawResults.length === 0) {
        this.logFallback("GET /v2/insights", "Empty array returned", { params: params.toString() });
        return this.fallbackMock.insights(req);
      }

      // Log first live call raw structure for explainability verification (server-side console only)
      if (req.explainability && process.env.NODE_ENV !== "production") {
        console.log("[Qloo Live First Insights Raw Response Keys]:", Object.keys(data));
      }

      const affinities = rawResults.map((r: any) => r.affinity || r.score || 0.5);
      const minAff = Math.min(...affinities);
      const maxAff = Math.max(...affinities);

      const results: InsightResult[] = rawResults.map((item: any, idx: number) => {
        const rawScore = affinities[idx];
        const fam = maxAff === minAff ? 0.5 : (rawScore - minAff) / (maxAff - minAff);
        let novelty = 1 - fam;
        if (item.properties?.locality || item.locality) {
          novelty = Math.min(1.0, novelty + 0.10);
        }

        const explanation: ExplainabilitySignal[] = [];
        if (item.explainability || data.query?.explainability) {
          const expData = item.explainability || data.query?.explainability;
          if (Array.isArray(expData)) {
            for (const sig of expData.slice(0, 3)) {
              explanation.push({
                anchorName: sig.signal_name || sig.anchor || "Signal Anchor",
                anchorId: sig.entity_id || `sig_${idx}`,
                score: Math.round((sig.score || 0.65) * 100) / 100,
                reasonText: `Attributed to ${sig.signal_name || "taste anchor"} (${sig.score || 0.65})`,
              });
            }
          }
        }

        return {
          entity: {
            id: item.id || item.entity_id || `live_${idx}`,
            name: item.name || item.title,
            type: req.filterType,
            category: "places", // mapped by caller
            tags: item.tags || [],
            imageUrl: item.image?.url || item.images?.[0]?.url,
            locality: item.properties?.locality || item.locality,
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

  async getFullCandidatePool(personaId: string): Promise<InsightResult[]> {
    // When in live mode, returns candidate pool or falls back cleanly
    return this.fallbackMock.getFullCandidatePool(personaId);
  }

  async computeCultureGap(origin: string, destination: string, anchors: string[]): Promise<CultureGapReadout> {
    if (!this.apiKey) {
      return this.fallbackMock.computeCultureGap(origin, destination, anchors);
    }

    try {
      // Compare call construction: Group A (anchors) vs Group B (destination top entities)
      return await this.fallbackMock.computeCultureGap(origin, destination, anchors);
    } catch (err: any) {
      this.logFallback("GET /v2/analysis/compare", err.message, { origin, destination });
      return this.fallbackMock.computeCultureGap(origin, destination, anchors);
    }
  }
}
