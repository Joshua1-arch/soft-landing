import { MockQlooAdapter } from "./lib/qloo/mock.ts";
import { PERSONAS } from "./lib/qloo/fixtures/personas.ts";
import { sequencePlan } from "./lib/sequence.ts";
import type { UserPreferences } from "./lib/qloo/types.ts";

const adapter = new MockQlooAdapter();

function userFor(id: string): UserPreferences {
  const p = PERSONAS[id];
  return {
    originCity: p.origin,
    destinationCity: p.destination,
    anchors: p.anchors,
    resolvedAnchorIds: [],
    constraints: p.constraints,
    adventure: p.adventure,
    lovedTags: [],
    avoidTags: [],
    penalizedDomains: { music: 0, food: 0, film: 0, books: 0, podcasts: 0, places: 0 },
  };
}

const results: Record<string, Array<{ week: number; category: string; name: string; tags: string[] }>> = {};

for (const id of ["amara", "dmitri", "yuki"]) {
  const pool = await adapter.getFullCandidatePool(id);
  const plan = sequencePlan({ user: userFor(id), candidatePool: pool });
  results[id] = [];
  console.log(`\n=== ${id.toUpperCase()} (${plan.length} weeks) ===`);
  for (const week of plan) {
    for (const item of week.items) {
      results[id].push({ week: week.weekNumber, category: item.category, name: item.title, tags: item.entity.tags });
      console.log(`W${String(week.weekNumber).padStart(2, "0")} | ${item.category.padEnd(9)} | ${item.title} | tags=[${item.entity.tags.join(",")}]`);
    }
  }
  console.log(`TOTAL=${results[id].length}`);
  const unique = new Set(results[id].map((x) => x.name));
  console.log(`UNIQUE_NAMES=${unique.size}`);
}

function overlap(a: string, b: string) {
  const sa = new Set(results[a].map((x) => x.name));
  const sb = new Set(results[b].map((x) => x.name));
  const shared = [...sa].filter((n) => sb.has(n));
  return { count: shared.length, shared };
}

for (const [a, b] of [["amara", "dmitri"], ["amara", "yuki"], ["dmitri", "yuki"]] as const) {
  const r = overlap(a, b);
  console.log(`\nOVERLAP ${a} vs ${b}: ${r.count} shared names`);
  for (const n of r.shared) console.log(`  - ${n}`);
}

console.log("\n=== YUKI CONSTRAINT AUDIT ===");
for (const item of results["yuki"]) {
  const tags = item.tags.map((t) => t.toLowerCase());
  const veg = tags.some((t) => t.includes("veg") || t.includes("plant"));
  const meat = tags.some((t) => t.includes("meat") || t.includes("chicken") || t.includes("seafood") || t.includes("churrasco") || t.includes("suya"));
  const stepFree = tags.some((t) => t.includes("step-free") || t.includes("accessible") || t.includes("barrier-free"));
  const inaccessible = tags.some((t) => t.includes("stair") || t.includes("rough terrain") || t.includes("unpaved"));
  console.log(`W${item.week} ${item.category} "${item.name}" tags=[${item.tags.join(",")}] vegetarian_evidence=${veg} meat_tag=${meat} stepfree_tag=${stepFree} inaccessible_tag=${inaccessible}`);
}
