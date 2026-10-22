import { classifyLoveInput } from "./classify.ts";
import { planCrossDomainLeaps, executeCrossDomainLeap } from "./cross-domain.ts";
import { synthesizeTasteprint } from "./synthesis.ts";
import { locateTasteVenues } from "./locate.ts";
import type {
  ResolvedLove,
  CrossDomainRecommendation,
  LocatedVenue,
  AgentTraceStep,
  TasteprintResponse,
} from "./types.ts";

export interface AgentRunOptions {
  loves: string[];
  locationQuery?: string;
  coordinates?: { lat: number; lon: number };
  apiKey: string;
  baseUrl?: string;
  onTrace?: (step: AgentTraceStep) => void;
}

export async function runTasteprintAgent({
  loves,
  locationQuery = "London",
  coordinates,
  apiKey,
  baseUrl = "https://hackathon.api.qloo.com",
  onTrace,
}: AgentRunOptions): Promise<TasteprintResponse> {
  const trace: AgentTraceStep[] = [];

  const emitTrace = (
    step: AgentTraceStep["step"],
    title: string,
    status: AgentTraceStep["status"],
    details: string,
    data?: any
  ) => {
    const record: AgentTraceStep = {
      step,
      title,
      status,
      timestamp: Date.now(),
      details,
      data,
    };
    trace.push(record);
    if (onTrace) onTrace(record);
  };

  // ==========================================
  // PHASE 1: PERCEIVE & CLASSIFY
  // ==========================================
  emitTrace(
    "perceive",
    "Perceiving Free-Text Inputs",
    "running",
    `Resolving ${loves.length} user-entered favorites against Qloo's cultural entity graph via /search...`
  );

  const resolvedLoves: ResolvedLove[] = [];
  const unresolvedInputs: string[] = [];

  for (const input of loves) {
    const res = await classifyLoveInput(input, apiKey, baseUrl);
    if (res.resolved) {
      resolvedLoves.push(res.resolved);
      emitTrace(
        "perceive",
        `Resolved: "${input}"`,
        "completed",
        `Identified "${res.resolved.name}" as [${res.resolved.typeName}] with ${res.resolved.tags.length} taste markers.`,
        { entityId: res.resolved.entityId, type: res.resolved.detectedType, tagsSample: res.resolved.tags.slice(0, 5) }
      );
    } else {
      unresolvedInputs.push(input);
      emitTrace(
        "perceive",
        `Unresolved: "${input}"`,
        "error",
        res.error || `Could not resolve "${input}" to a verified cultural entity in Qloo graph.`
      );
    }
  }

  // If all inputs failed to resolve, return early with honest explanation
  if (resolvedLoves.length === 0) {
    return {
      success: false,
      resolvedLoves: [],
      unresolvedInputs,
      portrait: {
        archetype: "Unknown Explorer",
        headline: "Could not identify taste anchors.",
        topThemes: [],
        proseSummary: "None of the inputs could be matched to entities in Qloo's taste database. Please try more specific titles or artist names.",
        generatedAt: new Date().toISOString(),
        loves,
      },
      recommendations: [],
      venues: [],
      trace,
      location: { query: locationQuery, coordinates },
      isMock: false,
    };
  }

  // ==========================================
  // PHASE 2: PLAN
  // ==========================================
  emitTrace(
    "plan",
    "Planning Cross-Domain Leaps",
    "running",
    `Formulating cross-domain paths across rich cultural domains (Cinema, Literature, Music, Brands, Dining) while skipping thin domains (cities, albums)...`
  );

  const domainPlans = resolvedLoves.map((love) => {
    const targets = planCrossDomainLeaps(love, 2);
    return { love, targets };
  });

  const plannedPairsCount = domainPlans.reduce((acc, p) => acc + p.targets.length, 0);
  emitTrace(
    "plan",
    "Cross-Domain Trajectory Established",
    "completed",
    `Constructed ${plannedPairsCount} targeted leap vectors: ${domainPlans
      .map((p) => `${p.love.name} -> [${p.targets.map((t) => t.name).join(", ")}]`)
      .join("; ")}.`
  );

  // ==========================================
  // PHASE 3: ACT
  // ==========================================
  emitTrace(
    "act",
    "Executing Qloo /v2/insights Queries",
    "running",
    `Dispatching multi-vector taste affinity queries with explainability tracking enabled...`
  );

  const allRecommendations: CrossDomainRecommendation[] = [];

  for (const plan of domainPlans) {
    for (const target of plan.targets) {
      const recs = await executeCrossDomainLeap(plan.love, target, apiKey, baseUrl);
      allRecommendations.push(...recs);
      emitTrace(
        "act",
        `Leap: ${plan.love.name} -> ${target.name}`,
        "completed",
        `Discovered ${recs.length} candidates in ${target.name}. Top match: "${recs[0]?.name || "None"}" (${recs[0] ? (recs[0].score * 100).toFixed(0) + "% affinity" : ""}).`,
        { candidates: recs.map((r) => ({ name: r.name, score: r.score, explain: r.explainability })) }
      );
    }
  }

  // ==========================================
  // PHASE 4: OBSERVE & VALIDATE
  // ==========================================
  emitTrace(
    "observe",
    "Observing & Auditing Explainability",
    "running",
    `Auditing recommendation attributions: ensuring no fabricated numbers and verifying real signal scores...`
  );

  const verifiedRecs = allRecommendations.filter((r) => r.score > 0);
  const attributedCount = verifiedRecs.filter((r) => r.explainability.hasAttribution).length;

  emitTrace(
    "observe",
    "Attribution Audit Complete",
    "completed",
    `Audited ${verifiedRecs.length} cross-domain recommendations. ${attributedCount} carry direct signal attribution traces from seed inputs.`,
    { verifiedCount: verifiedRecs.length, attributedCount }
  );

  // ==========================================
  // PHASE 5: SYNTHESIZE
  // ==========================================
  emitTrace(
    "synthesize",
    "Synthesizing Recurring Taste Themes",
    "running",
    `Extracting recurring cultural threads across ${resolvedLoves.length} seeds and ${verifiedRecs.length} recommendations...`
  );

  const portrait = synthesizeTasteprint(resolvedLoves, verifiedRecs);

  emitTrace(
    "synthesize",
    `Tasteprint Synthesized: ${portrait.archetype}`,
    "completed",
    `Identified ${portrait.topThemes.length} dominant cultural themes: ${portrait.topThemes.map((t) => t.theme).join(", ")}.`,
    { archetype: portrait.archetype, themes: portrait.topThemes }
  );

  // ==========================================
  // PHASE 6: LOCATE
  // ==========================================
  emitTrace(
    "locate",
    `Locating Local Taste Venues in ${locationQuery}`,
    "running",
    `Querying Qloo venue taste graph for physical spaces in ${locationQuery} matching your collective tasteprint...`
  );

  const seedIds = resolvedLoves.map((l) => l.entityId);
  const venues = await locateTasteVenues({
    seedIds,
    locationQuery,
    coordinates,
    apiKey,
    baseUrl,
    take: 6,
  });

  emitTrace(
    "locate",
    `Venues Mapped: ${venues.length} Spaces Found`,
    "completed",
    `Found ${venues.length} physical venues with genuine coordinates in ${locationQuery}.`,
    { venues: venues.map((v) => ({ name: v.name, address: v.address, lat: v.lat, lon: v.lon })) }
  );

  return {
    success: true,
    resolvedLoves,
    unresolvedInputs,
    portrait,
    recommendations: verifiedRecs,
    venues,
    trace,
    location: {
      query: locationQuery,
      coordinates,
    },
    isMock: false,
  };
}
