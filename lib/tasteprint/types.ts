export type DomainType =
  | "urn:entity:artist"
  | "urn:entity:movie"
  | "urn:entity:tv_show"
  | "urn:entity:brand"
  | "urn:entity:place"
  | "urn:entity:book"
  | "urn:entity:author";

export interface ResolvedLove {
  rawInput: string;
  entityId: string;
  name: string;
  detectedType: DomainType | "unknown";
  typeName: string;
  tags: string[];
  disambiguation?: string;
  confidence: number;
}

export interface CrossDomainRecommendation {
  sourceSeed: string;
  targetDomain: DomainType;
  targetDomainName: string;
  entityId: string;
  name: string;
  score: number; // 0.0 to 1.0 (from Qloo query.score)
  explainability: {
    hasAttribution: boolean;
    attributionScore: number | null; // e.g. 1.0 = strong affinity / direct attribution
    reason: string;
  };
  tags: string[];
  imageUrl?: string;
  description?: string;
  properties?: Record<string, any>;
}

export interface LocatedVenue {
  entityId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  genre: string;
  businessRating?: number;
  imageUrl?: string;
  tags: string[];
  score: number;
  matchingTheme: string;
}

export interface TasteprintPortrait {
  archetype: string;
  headline: string;
  topThemes: Array<{
    theme: string;
    count: number; // how many of the 4 loves contributed
    originSeeds: string[];
    sampleTags: string[];
  }>;
  proseSummary: string;
  generatedAt: string;
  loves: string[];
}

export type AgentStepStatus = "pending" | "running" | "completed" | "error";

export interface AgentTraceStep {
  step: "perceive" | "plan" | "act" | "observe" | "synthesize" | "locate";
  title: string;
  status: AgentStepStatus;
  timestamp: number;
  details: string;
  data?: any;
}

export interface TasteprintResponse {
  success: boolean;
  resolvedLoves: ResolvedLove[];
  unresolvedInputs: string[];
  portrait: TasteprintPortrait;
  recommendations: CrossDomainRecommendation[];
  venues: LocatedVenue[];
  trace: AgentTraceStep[];
  location: {
    query: string;
    coordinates?: { lat: number; lon: number };
  };
  isMock: boolean;
}
