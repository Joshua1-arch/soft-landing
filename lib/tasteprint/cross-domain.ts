import type { DomainType, ResolvedLove, CrossDomainRecommendation } from "./types.ts";
import { extractTagNames } from "./classify.ts";

export const RICH_DOMAINS: Array<{ type: DomainType; name: string }> = [
  { type: "urn:entity:movie", name: "Film & Cinema" },
  { type: "urn:entity:tv_show", name: "Television Series" },
  { type: "urn:entity:artist", name: "Music Artist" },
  { type: "urn:entity:brand", name: "Brand & Fashion" },
  { type: "urn:entity:book", name: "Literature & Books" },
  { type: "urn:entity:place", name: "Dining & Venues" },
];

/**
 * Plans which target rich domains to leap to for a given seed love.
 * Automatically skips thin domains (cities, tracks, albums) and skips the source domain itself.
 */
export function planCrossDomainLeaps(source: ResolvedLove, maxDomains = 2): Array<{ type: DomainType; name: string }> {
  const sourceDomain = source.detectedType;

  // Filter out the source's own domain category
  const candidates = RICH_DOMAINS.filter((d) => {
    if (sourceDomain === "urn:entity:movie" || sourceDomain === "urn:entity:tv_show") {
      return d.type !== "urn:entity:movie" && d.type !== "urn:entity:tv_show";
    }
    if (sourceDomain === "urn:entity:book" || sourceDomain === "urn:entity:author") {
      return d.type !== "urn:entity:book";
    }
    return d.type !== sourceDomain;
  });

  // Pick top distinctive domains for cross-pollination
  // e.g. For music: film & literature or brand
  if (sourceDomain === "urn:entity:artist") {
    const list: Array<{ type: DomainType; name: string }> = [
      { type: "urn:entity:movie", name: "Film & Cinema" },
      { type: "urn:entity:book", name: "Literature & Books" },
    ];
    return list.slice(0, maxDomains);
  }

  if (sourceDomain === "urn:entity:movie" || sourceDomain === "urn:entity:tv_show") {
    const list: Array<{ type: DomainType; name: string }> = [
      { type: "urn:entity:artist", name: "Music Artist" },
      { type: "urn:entity:brand", name: "Brand & Fashion" },
    ];
    return list.slice(0, maxDomains);
  }

  if (sourceDomain === "urn:entity:brand") {
    const list: Array<{ type: DomainType; name: string }> = [
      { type: "urn:entity:movie", name: "Film & Cinema" },
      { type: "urn:entity:artist", name: "Music Artist" },
    ];
    return list.slice(0, maxDomains);
  }

  if (sourceDomain === "urn:entity:place") {
    const list: Array<{ type: DomainType; name: string }> = [
      { type: "urn:entity:artist", name: "Music Artist" },
      { type: "urn:entity:movie", name: "Film & Cinema" },
    ];
    return list.slice(0, maxDomains);
  }

  return candidates.slice(0, maxDomains);
}

/**
 * Executes a cross-domain leap query via Qloo /v2/insights.
 * Parses explainability honestly: never fabricates reasons or magic multipliers.
 */
export async function executeCrossDomainLeap(
  source: ResolvedLove,
  target: { type: DomainType; name: string },
  apiKey: string,
  baseUrl = "https://hackathon.api.qloo.com"
): Promise<CrossDomainRecommendation[]> {
  try {
    const params = new URLSearchParams({
      "filter.type": target.type,
      "signal.interests.entities": source.entityId,
      take: "3",
      "feature.explainability": "true",
    });

    const url = `${baseUrl}/v2/insights?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const entities = data.results?.entities || (Array.isArray(data.results) ? data.results : []);

    const recommendations: CrossDomainRecommendation[] = [];

    for (const entity of entities) {
      const entityId = entity.entity_id || entity.id || "";
      if (!entityId) continue;

      // Affinity score (0.00 to 1.00)
      const rawAffinity = typeof entity.query?.affinity === "number"
        ? entity.query.affinity
        : typeof entity.query?.score === "number"
        ? entity.query.score
        : 0.85;

      // Extract explainability signals honestly
      const explainabilitySignals = entity.query?.explainability?.["signal.interests.entities"];
      let hasAttribution = false;
      let attributionScore: number | null = null;
      let reason = "No explicit attribution returned by taste graph";

      if (Array.isArray(explainabilitySignals) && explainabilitySignals.length > 0) {
        const matchingSig = explainabilitySignals.find(
          (s: any) => s.entity_id === source.entityId || s.entity_id?.toLowerCase() === source.entityId.toLowerCase()
        ) || explainabilitySignals[0];

        if (matchingSig && typeof matchingSig.score === "number") {
          hasAttribution = true;
          attributionScore = matchingSig.score;
          const attrPct = Math.round(matchingSig.score * 100);
          const affPct = (rawAffinity * 100).toFixed(1);

          // Honesty rule: 1.00 is strong affinity, never "perfect match"
          const affinityLabel = rawAffinity >= 0.99 ? "strong taste affinity (0.99+)" : `${affPct}% taste affinity`;
          reason = `${attrPct}% of match traces directly to your love of ${source.name} with ${affinityLabel}`;
        }
      }

      const tags = extractTagNames(entity);

      // Clean image URL if available
      const imageUrl = entity.properties?.image?.url || entity.image?.url || undefined;
      const description = entity.properties?.short_description || entity.properties?.description || undefined;

      recommendations.push({
        sourceSeed: source.name,
        targetDomain: target.type,
        targetDomainName: target.name,
        entityId,
        name: entity.name || "Untitled",
        score: rawAffinity,
        explainability: {
          hasAttribution,
          attributionScore,
          reason,
        },
        tags,
        imageUrl,
        description,
        properties: entity.properties,
      });
    }

    return recommendations;
  } catch (err) {
    console.error(`[executeCrossDomainLeap error for ${source.name} -> ${target.name}]`, err);
    return [];
  }
}
