import { InsightEntityType, InsightRequest } from "./types";

/**
 * Parameter whitelist discipline per filter.type
 * Documented in Qloo Developer Guide to avoid silent empty results
 */
const SUPPORTED_PARAMS_BY_TYPE: Record<InsightEntityType, Set<string>> = {
  "urn:entity:artist": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "signal.demographics.age",
    "signal.demographics.audiences",
    "feature.explainability",
    "take",
    "page",
    "offset",
  ]),
  "urn:entity:movie": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "filter.release_year.min",
    "filter.release_year.max",
    "filter.content_rating",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:tv_show": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "filter.release_year.min",
    "filter.release_year.max",
    "filter.release_country",
    "filter.content_rating",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:book": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "filter.publication_year.min",
    "filter.publication_year.max",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:podcast": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:place": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "filter.location.query",
    "filter.location",
    "filter.location.radius",
    "filter.tags",
    "filter.price_level.max",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:brand": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:destination": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:person": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "filter.date_of_birth.min",
    "filter.date_of_birth.max",
    "feature.explainability",
    "take",
    "page",
  ]),
  "urn:entity:video_game": new Set([
    "filter.type",
    "signal.interests.entities",
    "signal.interests.tags",
    "feature.explainability",
    "take",
    "page",
  ]),
};

export interface SanitizedParamsResult {
  params: URLSearchParams;
  removed: string[];
}

export function sanitizeInsightsParams(
  filterType: InsightEntityType,
  rawParams: Record<string, string | number | boolean | undefined>
): SanitizedParamsResult {
  const allowed = SUPPORTED_PARAMS_BY_TYPE[filterType] || new Set();
  const params = new URLSearchParams();
  const removed: string[] = [];

  for (const [key, value] of Object.entries(rawParams)) {
    if (value === undefined || value === "") continue;

    if (allowed.has(key)) {
      params.append(key, String(value));
    } else {
      removed.push(key);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Qloo Param Discipline] Stripped unsupported parameter '${key}' for ${filterType}`);
      }
    }
  }

  return { params, removed };
}
