import { LiveQlooAdapter } from "../qloo/live.ts";
import type { DomainType, ResolvedLove } from "./types.ts";

export interface ClassificationResult {
  input: string;
  resolved: ResolvedLove | null;
  error?: string;
}

export function detectDomainType(entity: any): { type: DomainType | "unknown"; typeName: string } {
  const types: string[] = Array.isArray(entity.types)
    ? entity.types
    : entity.type
    ? [entity.type]
    : [];

  const typeStr = types.join(" ").toLowerCase();

  if (typeStr.includes("artist") || typeStr.includes("musician") || typeStr.includes("singer")) {
    return { type: "urn:entity:artist", typeName: "Music Artist" };
  }
  if (typeStr.includes("movie") || typeStr.includes("film")) {
    return { type: "urn:entity:movie", typeName: "Film / Movie" };
  }
  if (typeStr.includes("tv_show") || typeStr.includes("tv_series") || typeStr.includes("television")) {
    return { type: "urn:entity:tv_show", typeName: "TV Series" };
  }
  if (typeStr.includes("brand") || typeStr.includes("fashion") || typeStr.includes("apparel")) {
    return { type: "urn:entity:brand", typeName: "Brand & Fashion" };
  }
  if (typeStr.includes("author") || typeStr.includes("writer")) {
    return { type: "urn:entity:author", typeName: "Author & Literature" };
  }
  if (typeStr.includes("book") || typeStr.includes("novel") || typeStr.includes("publication")) {
    return { type: "urn:entity:book", typeName: "Book & Literature" };
  }
  if (typeStr.includes("place") || typeStr.includes("establishment")) {
    if (LiveQlooAdapter.isDiningPlace(entity)) {
      return { type: "urn:entity:place", typeName: "Dining & Restaurant" };
    }
    return { type: "urn:entity:place", typeName: "Place & Venue" };
  }

  // Fallback checks on properties
  if (entity.properties?.primary_genre?.id?.includes("restaurant") || entity.properties?.primary_genre?.id?.includes("cafe")) {
    return { type: "urn:entity:place", typeName: "Dining & Restaurant" };
  }

  return { type: "unknown", typeName: "General Cultural Entity" };
}

export function extractTagNames(entity: any): string[] {
  if (!entity || !Array.isArray(entity.tags)) return [];
  const set = new Set<string>();
  for (const t of entity.tags) {
    if (typeof t === "string" && t.trim()) {
      set.add(t.trim());
    } else if (t && typeof t.name === "string" && t.name.trim()) {
      set.add(t.name.trim());
    }
  }
  return Array.from(set);
}

/**
 * Resolves a free-text string (e.g. "Fela Kuti", "Breaking Bad", "Nike")
 * to a verified Qloo entity using /search.
 */
export async function classifyLoveInput(
  rawInput: string,
  apiKey: string,
  baseUrl = "https://hackathon.api.qloo.com"
): Promise<ClassificationResult> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      input: rawInput,
      resolved: null,
      error: "Input is empty",
    };
  }

  try {
    const url = `${baseUrl}/search?query=${encodeURIComponent(trimmed)}&take=5`;
    const res = await fetch(url, {
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (!res.ok) {
      return {
        input: trimmed,
        resolved: null,
        error: `Qloo /search returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const entities = data.results?.entities || (Array.isArray(data.results) ? data.results : []);

    if (!entities || entities.length === 0) {
      return {
        input: trimmed,
        resolved: null,
        error: `Could not resolve "${trimmed}" to an entity in Qloo's taste graph. Please try another name or title.`,
      };
    }

    // Heuristic selection:
    // 1. If user input mentions dish/food terms, prefer dining place
    const isFoodQuery = /rice|sushi|taco|soup|curry|pasta|pizza|ramen|steak|food|dish|bakery|cafe/i.test(trimmed);
    let chosen = entities[0];

    if (isFoodQuery) {
      const diningMatch = entities.find((e: any) => LiveQlooAdapter.isDiningPlace(e));
      if (diningMatch) {
        chosen = diningMatch;
      }
    }

    const { type, typeName } = detectDomainType(chosen);
    const tags = extractTagNames(chosen);
    const entityId = chosen.entity_id || chosen.id || chosen._id || "";

    if (!entityId) {
      return {
        input: trimmed,
        resolved: null,
        error: `Entity found for "${trimmed}" is missing an entity_id.`,
      };
    }

    return {
      input: trimmed,
      resolved: {
        rawInput: trimmed,
        entityId,
        name: chosen.name || trimmed,
        detectedType: type,
        typeName,
        tags,
        disambiguation: chosen.disambiguation || chosen.properties?.short_description || undefined,
        confidence: 0.95,
      },
    };
  } catch (err: any) {
    return {
      input: trimmed,
      resolved: null,
      error: err?.message || "Search network error",
    };
  }
}
