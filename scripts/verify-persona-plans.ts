import fs from "node:fs";
import path from "node:path";
import { LiveQlooAdapter } from "../lib/qloo/live.ts";
import { PERSONAS } from "../lib/qloo/fixtures/personas.ts";
import { sequencePlan } from "../lib/sequence.ts";
import type { UserPreferences } from "../lib/qloo/types.ts";

// Load .env.local safely
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [k, ...v] = trimmed.split("=");
    if (k && v.length) {
      process.env[k.trim()] = v.join("=").trim();
    }
  }
}

const adapter = new LiveQlooAdapter();

async function verifyPersona(id: string) {
  const persona = PERSONAS[id];
  console.log(`\n======================================================`);
  console.log(`PERSONA: ${persona.name} (${persona.id.toUpperCase()})`);
  console.log(`Origin: ${persona.origin} -> Destination: ${persona.destination}`);
  console.log(`Anchors: ${persona.anchors.join(", ")}`);

  // 1. Culture Gap Readout
  const gap = await adapter.computeCultureGap(persona.origin, persona.destination, persona.anchors);
  console.log(`\n--- Culture-Gap Readout Numbers ---`);
  console.log(`Overall Overlap: ${gap.overallOverlap} (${Math.round(gap.overallOverlap * 100)}%)`);
  console.log(`Summary: ${gap.summarySentence}`);
  console.log(`Category Breakdown:`);
  for (const b of gap.breakdown) {
    console.log(`  - ${b.label} (${b.category}): ${b.overlap.toFixed(2)} [${b.level}] - ${b.verdict}`);
  }

  // 2. Candidate Pool
  const pool = await adapter.getFullCandidatePool(id);
  console.log(`\n--- Live Candidate Pool ---`);
  console.log(`Total items: ${pool.length}`);
  const catCounts: Record<string, number> = {};
  for (const item of pool) {
    catCounts[item.entity.category] = (catCounts[item.entity.category] || 0) + 1;
  }
  console.log(`Domain counts:`, catCounts);

  // Check fixture leak
  const fixturePrefixes = ["am-", "dm-", "yk-"];
  const fixtureLeaks = pool.filter((it) => fixturePrefixes.some((p) => it.entity.id.startsWith(p)));
  console.log(`Fixture leaks detected in pool: ${fixtureLeaks.length}`);
  if (fixtureLeaks.length > 0) {
    console.log(`LEAKED FIXTURES:`, fixtureLeaks.map((f) => f.entity.id + ": " + f.entity.name));
  }

  // 3. Sequence Plan
  const user: UserPreferences = {
    originCity: persona.origin,
    destinationCity: persona.destination,
    anchors: persona.anchors,
    resolvedAnchorIds: [],
    constraints: persona.constraints,
    adventure: persona.adventure,
    lovedTags: [],
    avoidTags: [],
    penalizedDomains: { music: 0, food: 0, film: 0, books: 0, podcasts: 0, places: 0 },
  };

  const plan = sequencePlan({ user, candidatePool: pool });
  console.log(`\n--- Plan Generated ---`);
  console.log(`Weeks count: ${plan.length}`);
  console.log(`Week 1 Theme: "${plan[0].themeTitle}" - Target Novelty: ${plan[0].targetNovelty}`);
  console.log(`Week 1 Items (3 items):`);
  for (let i = 0; i < plan[0].items.length; i++) {
    const it = plan[0].items[i];
    console.log(`  [${i + 1}] ${it.title} (${it.category})`);
    console.log(`      ID: ${it.id} | Novelty: ${it.novelty} | Familiarity: ${it.familiarity}`);
    console.log(`      Subtitle: ${it.subtitle}`);
    if (it.explanation && it.explanation.length > 0) {
      console.log(`      Explainability:`, it.explanation);
    } else {
      console.log(`      Explainability: None (Panel fallback: "Why: similar audience affinity in destination metro")`);
    }
  }

  return { persona, gap, plan, pool };
}

async function main() {
  console.log("=== PHASE 4: LIVE ONBOARDING & PLAN VERIFICATION ===");
  console.log(`QLOO_MODE: ${process.env.QLOO_MODE}`);
  console.log(`QLOO_BASE_URL: ${process.env.QLOO_BASE_URL}`);

  const amaraRes = await verifyPersona("amara");
  const dmitriRes = await verifyPersona("dmitri");
  const yukiRes = await verifyPersona("yuki");

  console.log("\n======================================================");
  console.log("=== WHYPANEL ATTRIBUTION EVIDENCE ===");
  const sampleItem = amaraRes.plan[0].items[0];
  console.log(`Sample item chosen: ${sampleItem.title} (${sampleItem.id})`);
  console.log(`Category: ${sampleItem.category}`);
  console.log(`Property path in raw Qloo response:`);
  console.log(`  Affinity: response.results.entities[i].query.affinity`);
  console.log(`  Explainability signals: response.results.entities[i].query.explainability["signal.interests.entities"]`);
  console.log(`WhyPanel Display Values:`);
  if (sampleItem.explanation && sampleItem.explanation.length > 0) {
    for (const exp of sampleItem.explanation) {
      console.log(`  - Anchor: "${exp.anchorName}" | Score: ${exp.score} | Reason: "${exp.reasonText}"`);
    }
  } else {
    console.log(`  - Fallback: "Why: similar audience affinity in destination metro"`);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in verify-persona-plans:", err);
  process.exit(1);
});
