import type {
  QlooAdapter,
  Entity,
  SearchEntityType,
  InsightRequest,
  InsightResult,
  CultureGapReadout,
  ExplainabilitySignal,
} from "./types.ts";
import { PERSONAS, MOCK_CULTURE_GAPS, generateMockCandidatePool } from "./fixtures/personas.ts";

export class MockQlooAdapter implements QlooAdapter {
  private logCall(endpoint: string, details: Record<string, unknown>) {
    console.log(`[Qloo Mock Adapter] ${endpoint}`, JSON.stringify(details));
  }

  private async simulateLatency(minMs = 120, maxMs = 280): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async resolveEntities(query: string, types: SearchEntityType[], limit = 5): Promise<Entity[]> {
    await this.simulateLatency();
    this.logCall("GET /search", { query, types, limit });

    // Search across all candidate pools for matching query
    const allEntities = [
      ...generateMockCandidatePool("amara"),
      ...generateMockCandidatePool("dmitri"),
      ...generateMockCandidatePool("yuki"),
    ];

    const qLower = query.toLowerCase();
    const matches = allEntities.filter(
      (e) => e.name.toLowerCase().includes(qLower) || e.tags.some((t) => t.toLowerCase().includes(qLower))
    );

    return matches.slice(0, limit);
  }

  async findTags(query: string, limit = 5): Promise<{ id: string; name: string }[]> {
    await this.simulateLatency();
    this.logCall("GET /v2/tags", { "filter.query": query, limit });

    const staticTags = [
      { id: "tag_afrobeats", name: "Afrobeats" },
      { id: "tag_jollof", name: "Jollof Rice" },
      { id: "tag_bossa_nova", name: "Bossa Nova" },
      { id: "tag_city_pop", name: "City Pop" },
      { id: "tag_ramen", name: "Ramen" },
      { id: "tag_murakami", name: "Haruki Murakami" },
      { id: "tag_ghibli", name: "Studio Ghibli" },
      { id: "tag_halal", name: "Halal Dining" },
      { id: "tag_vegetarian", name: "Vegetarian" },
    ];

    const qLower = query.toLowerCase();
    return staticTags.filter((t) => t.name.toLowerCase().includes(qLower)).slice(0, limit);
  }

  async insights(req: InsightRequest): Promise<InsightResult[]> {
    await this.simulateLatency();
    this.logCall("GET /v2/insights", {
      "filter.type": req.filterType,
      signals: req.signalEntities,
      location: req.locationQuery,
      explainability: req.explainability,
    });

    // Detect persona by signal entities or defaults to Amara
    let personaId = "amara";
    if (req.locationQuery?.toLowerCase().includes("lisbon")) personaId = "dmitri";
    if (req.locationQuery?.toLowerCase().includes("toronto")) personaId = "yuki";

    const pool = generateMockCandidatePool(personaId);
    const filtered = pool.filter((item) => item.type === req.filterType);

    // If specific domain has fewer items, take relevant subset
    const items = filtered.length > 0 ? filtered : pool.slice(0, req.take || 12);

    // Compute raw scores and normalized familiarity
    // Deterministic pseudo-affinity based on id hash
    const rawScores = items.map((item, idx) => {
      const hash = item.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return 0.45 + (hash % 50) / 100;
    });

    const minScore = Math.min(...rawScores);
    const maxScore = Math.max(...rawScores);

    return items.map((entity, idx) => {
      const raw = rawScores[idx];
      const fam = maxScore === minScore ? 0.5 : (raw - minScore) / (maxScore - minScore);

      // Novelty = 1 - fam + locality bonus (0.10 if destination-linked)
      let novelty = 1 - fam;
      if (entity.locality) {
        novelty = Math.min(1.0, novelty + 0.10);
      }

      // Generate realistic explainability signals
      const persona = PERSONAS[personaId] || PERSONAS.amara;
      const primaryAnchor = persona.anchors[idx % persona.anchors.length] || "Cultural roots";
      const explanation: ExplainabilitySignal[] = [
        {
          anchorName: primaryAnchor,
          anchorId: `anchor_${idx}`,
          score: Math.round((0.55 + ((idx * 7) % 40) / 100) * 100) / 100,
          reasonText: `Because you love ${primaryAnchor} (${Math.round((0.55 + ((idx * 7) % 40) / 100) * 100) / 100})`,
        },
        {
          anchorName: entity.locality || "Local Audience",
          anchorId: `loc_${idx}`,
          score: Math.round((0.45 + ((idx * 11) % 45) / 100) * 100) / 100,
          reasonText: entity.locality
            ? `Popular in ${entity.locality} cultural circles`
            : "Strong shared affinity in target destination",
        },
      ];

      return {
        entity,
        rawAffinity: raw,
        normalizedFamiliarity: Math.round(fam * 1000) / 1000,
        novelty: Math.round(novelty * 1000) / 1000,
        explanation,
      };
    });
  }

  async getFullCandidatePool(personaId: string): Promise<InsightResult[]> {
    await this.simulateLatency(30, 80);
    const pool = generateMockCandidatePool(personaId);
    const rawScores = pool.map((item, idx) => {
      const hash = item.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return 0.45 + (hash % 50) / 100;
    });

    const minScore = Math.min(...rawScores);
    const maxScore = Math.max(...rawScores);

    const persona = PERSONAS[personaId] || PERSONAS.amara;

    return pool.map((entity, idx) => {
      const raw = rawScores[idx];
      const fam = maxScore === minScore ? 0.5 : (raw - minScore) / (maxScore - minScore);
      let novelty = 1 - fam;
      if (entity.locality) {
        novelty = Math.min(1.0, novelty + 0.10);
      }

      const primaryAnchor = persona.anchors[idx % persona.anchors.length] || "Cultural roots";
      const explanation: ExplainabilitySignal[] = [
        {
          anchorName: primaryAnchor,
          anchorId: `anchor_${idx}`,
          score: Math.round((0.55 + ((idx * 7) % 40) / 100) * 100) / 100,
          reasonText: `Because you love ${primaryAnchor} (${Math.round((0.55 + ((idx * 7) % 40) / 100) * 100) / 100})`,
        },
        {
          anchorName: entity.locality || "Local Audience",
          anchorId: `loc_${idx}`,
          score: Math.round((0.45 + ((idx * 11) % 45) / 100) * 100) / 100,
          reasonText: entity.locality
            ? `Popular in ${entity.locality} cultural circles`
            : "Strong shared affinity in target destination",
        },
      ];

      return {
        entity,
        rawAffinity: raw,
        normalizedFamiliarity: Math.round(fam * 1000) / 1000,
        novelty: Math.round(novelty * 1000) / 1000,
        explanation,
      };
    });
  }

  async computeCultureGap(origin: string, destination: string, anchors: string[]): Promise<CultureGapReadout> {
    await this.simulateLatency();
    this.logCall("GET /v2/analysis/compare", { origin, destination, anchors });

    if (destination.toLowerCase().includes("lisbon") || origin.toLowerCase().includes("são paulo")) {
      return MOCK_CULTURE_GAPS.dmitri;
    }
    if (destination.toLowerCase().includes("toronto") || origin.toLowerCase().includes("osaka")) {
      return MOCK_CULTURE_GAPS.yuki;
    }
    return MOCK_CULTURE_GAPS.amara;
  }
}
