/**
 * Qloo Cultural AI Type Definitions
 * Strict types separating /search and /v2/insights domains
 */

export type SearchEntityType =
  | "urn:entity:artist"
  | "urn:entity:author"
  | "urn:entity:director"
  | "urn:entity:actor"
  | "urn:entity:album"
  | "urn:entity:movie"
  | "urn:entity:tv_show"
  | "urn:entity:book"
  | "urn:entity:podcast"
  | "urn:entity:place"
  | "urn:entity:brand"
  | "urn:entity:destination"
  | "urn:entity:person"
  | "urn:entity:videogame"
  | "urn:entity:locality"
  | "urn:tag";

export type InsightEntityType =
  | "urn:entity:artist"
  | "urn:entity:movie"
  | "urn:entity:tv_show"
  | "urn:entity:book"
  | "urn:entity:podcast"
  | "urn:entity:place"
  | "urn:entity:brand"
  | "urn:entity:destination"
  | "urn:entity:person"
  | "urn:entity:video_game";

export type DomainCategory =
  | "music"
  | "food"
  | "film"
  | "books"
  | "podcasts"
  | "places";

export interface Entity {
  id: string;
  name: string;
  type: InsightEntityType | SearchEntityType;
  category: DomainCategory;
  tags: string[];
  imageUrl?: string;
  locality?: string;
  subtitle?: string;
  subtype?: string;
  primaryGenre?: string;
  cuisineDescription?: string;
  externalUrls?: {
    spotify?: string;
    googleMaps?: string;
    goodreads?: string;
    justWatch?: string;
    search?: string;
  };
}

export interface ExplainabilitySignal {
  anchorName: string;
  anchorId: string;
  score: number; // 0.0 to 1.0
  reasonText: string; // e.g. "Because you love Fela Kuti (0.71)"
}

// Confirmed Qloo Live API Explainability & Insights Response Types (from /v2/insights with feature.explainability=true)
export interface QlooEntityExplainabilitySignal {
  entity_id: string;
  score: number;
}

export interface QlooEntityExplainability {
  "signal.interests.entities"?: QlooEntityExplainabilitySignal[];
  [key: string]: unknown;
}

export interface QlooQueryExplainabilitySummary {
  entity_id: string;
  avg_score: number;
}

export interface QlooQueryExplainability {
  "signal.interests.entities"?: {
    effect_on_top3_recs?: QlooQueryExplainabilitySummary[];
    effect_on_top5_recs?: QlooQueryExplainabilitySummary[];
    effect_on_top10_recs?: QlooQueryExplainabilitySummary[];
    effect_on_all_recs?: QlooQueryExplainabilitySummary[];
  };
  [key: string]: unknown;
}

export interface QlooRawInsightsEntity {
  name: string;
  entity_id: string;
  type: string;
  subtype: string;
  properties?: {
    image?: { url: string };
    images?: Array<{ url: string; type?: string }>;
    short_description?: string;
    description?: string;
    known_for?: string;
    address?: string;
    geocode?: {
      city?: string;
      name?: string;
      metro?: string | null;
      country?: string;
      country_code?: string;
      admin1_region?: string;
      admin2_region?: string;
    };
    [key: string]: unknown;
  };
  popularity?: number;
  tags?: Array<{
    id?: string;
    tag_id?: string;
    name?: string;
    type?: string;
    value?: string;
  }>;
  query?: {
    affinity?: number;
    measurements?: Record<string, number>;
    explainability?: QlooEntityExplainability;
  };
  disambiguation?: string;
}

export interface QlooRawInsightsResponse {
  success?: boolean;
  results?: {
    entities?: QlooRawInsightsEntity[];
  };
  query?: {
    explainability?: QlooQueryExplainability;
  };
}

export interface InsightResult {
  entity: Entity;
  rawAffinity: number;
  normalizedFamiliarity: number; // 0 (unfamiliar) to 1 (familiar)
  novelty: number; // 1 - normalizedFamiliarity + locality bonus
  explanation?: ExplainabilitySignal[];
}

export interface InsightRequest {
  filterType: InsightEntityType;
  signalEntities: string[];
  signalTags?: string[];
  locationQuery?: string;
  locationRadius?: number;
  tagsFilter?: string[];
  maxPriceLevel?: number;
  contentRating?: string;
  take?: number;
  page?: number;
  explainability?: boolean;
}

export interface CategoryGap {
  category: DomainCategory;
  label: string;
  overlap: number; // 0.0 to 1.0 (computed)
  verdict: string; // Plain sentence e.g. "0.62 — you'll find your feet here fast"
  level: "easy" | "moderate" | "steep";
  hasData: boolean; // false when Qloo returns 0 tags or entity is missing
}

export interface CultureGapReadout {
  originCity: string;
  destinationCity: string;
  overallOverlap: number;
  summarySentence: string;
  breakdown: CategoryGap[];
}

export type ItemRating = "unrated" | "loved" | "notForMe";

export interface PlanItem {
  id: string;
  title: string;
  subtitle: string;
  category: DomainCategory;
  categoryIcon: string;
  entity: Entity;
  novelty: number;
  familiarity: number;
  rating: ItemRating;
  explanation: ExplainabilitySignal[];
  searchUrl: string;
}

export interface PlanWeek {
  weekNumber: number; // 1 to 12
  targetNovelty: number;
  themeTitle: string;
  themeSummary: string;
  items: PlanItem[];
  isExpanded: boolean;
}

export interface UserPreferences {
  originCity: string;
  destinationCity: string;
  anchors: string[]; // 3-5 terms
  resolvedAnchorIds: string[];
  constraints: string[]; // e.g. "halal", "vegetarian", "low budget"
  adventure: number; // 0-100
  lovedTags: string[];
  avoidTags: string[];
  penalizedDomains: Record<DomainCategory, number>; // temporary penalty for next 2 weeks
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  origin: string;
  destination: string;
  occupation: string;
  bio: string;
  anchors: string[];
  constraints: string[];
  adventure: number;
  storyBeat: string;
  avatarSeed: string;
}

export interface QlooAdapter {
  resolveEntities(query: string, types: SearchEntityType[], limit?: number): Promise<Entity[]>;
  findTags(query: string, limit?: number): Promise<{ id: string; name: string }[]>;
  insights(req: InsightRequest): Promise<InsightResult[]>;
  getFullCandidatePool(personaId: string): Promise<InsightResult[]>;
  computeCultureGap(origin: string, destination: string, anchors: string[]): Promise<CultureGapReadout>;
}
