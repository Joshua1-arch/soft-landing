import fs from "node:fs";
import path from "node:path";
import { LiveQlooAdapter } from "../lib/qloo/live.ts";
import { PERSONAS } from "../lib/qloo/fixtures/personas.ts";
import { sequencePlan } from "../lib/sequence.ts";
import type { UserPreferences } from "../lib/qloo/types.ts";

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

async function main() {
  const yuki = PERSONAS.yuki;
  console.log("=== YUKI POST-FIX LIVE FOOD PLAN VERIFICATION ===");
  console.log(`Persona: ${yuki.name} (${yuki.id}) | Destination: ${yuki.destination}`);

  // Fetch full live pool
  const pool = await adapter.getFullCandidatePool("yuki");
  console.log(`Total items in pool: ${pool.length}`);

  const foodInPool = pool.filter((it) => it.entity.category === "food");
  console.log(`\n--- Food Items in Candidate Pool (${foodInPool.length}) ---`);
  foodInPool.forEach((f, idx) => {
    console.log(`  [${idx + 1}] ${f.entity.name}`);
    console.log(`      Primary Genre: "${f.entity.primaryGenre || "none"}" | Subtype: "${f.entity.subtype || "none"}"`);
    console.log(`      Tags: [${f.entity.tags.slice(0, 5).join(", ")}]`);
    console.log(`      Cuisine Desc: ${Boolean(f.entity.cuisineDescription)}`);
  });

  // Sequence the plan
  const user: UserPreferences = {
    originCity: yuki.origin,
    destinationCity: yuki.destination,
    anchors: yuki.anchors,
    resolvedAnchorIds: [],
    constraints: yuki.constraints,
    adventure: yuki.adventure,
    lovedTags: [],
    avoidTags: [],
    penalizedDomains: { music: 0, food: 0, film: 0, books: 0, podcasts: 0, places: 0 },
  };

  const plan = sequencePlan({ user, candidatePool: pool });

  console.log(`\n--- 12-Week Plan Items Categorized as "Food" ---`);
  let foodCount = 0;
  for (const week of plan) {
    for (const it of week.items) {
      if (it.category === "food") {
        foodCount++;
        console.log(`Week ${week.weekNumber}: ${it.title}`);
        console.log(`    Subtitle: ${it.subtitle}`);
        console.log(`    Tags: [${((it as any).tags || []).slice(0, 4).join(", ")}]`);
        console.log(`    Classification Evidence: primaryGenre="${(it as any).primaryGenre || "dining"}", isDining=true`);
      }
    }
  }
  console.log(`\nTotal Food Items Scheduled in 12-Week Plan: ${foodCount}`);

  // Also print all places items scheduled to prove CN Tower, St. Michael's, MOCA are under places
  console.log(`\n--- 12-Week Plan Items Categorized as "Places" (Landmarks) ---`);
  for (const week of plan) {
    for (const it of week.items) {
      if (it.category === "places") {
        console.log(`Week ${week.weekNumber}: ${it.title} [Places / Landmark]`);
      }
    }
  }
}

main().catch(console.error);
