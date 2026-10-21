// scripts/audit.ts — run: node --experimental-strip-types scripts/audit.ts
import { MockQlooAdapter } from "../lib/qloo/mock.ts";
import { PERSONAS } from "../lib/qloo/fixtures/personas.ts";
import { sequencePlan } from "../lib/sequence.ts";
import type { UserPreferences } from "../lib/qloo/types.ts";

const adapter = new MockQlooAdapter();
let failures = 0;
const fail = (m: string) => { failures++; console.log(`  FAIL  ${m}`); };
const pass = (m: string) => console.log(`  ok    ${m}`);

function userFor(id: string): UserPreferences {
  const p = PERSONAS[id];
  return {
    originCity: p.origin, destinationCity: p.destination,
    anchors: p.anchors, resolvedAnchorIds: [],
    constraints: p.constraints, adventure: p.adventure,
    lovedTags: [], avoidTags: [],
    penalizedDomains: { music: 0, food: 0, film: 0, books: 0, podcasts: 0, places: 0 },
  };
}

const keyOf = (x: any) => x?.entity?.id ?? x?.id ?? x?.entity?.name ?? x?.name ?? JSON.stringify(x);
type Row = { week: number; category: string; name: string; tags: string[] };

function run(id: string, pool: any[]) {
  const plan = sequencePlan({ user: userFor(id), candidatePool: pool });
  const rows: Row[] = [];
  for (const w of plan) for (const it of w.items)
    rows.push({ week: w.weekNumber, category: it.category, name: it.title, tags: it.entity?.tags ?? [] });
  return { plan, rows };
}

// ---- build pools -------------------------------------------------------
const perPersona: Record<string, any[]> = {};
for (const id of ["amara", "dmitri", "yuki"]) perPersona[id] = await adapter.getFullCandidatePool(id);

const unionMap = new Map<string, any>();
for (const id of Object.keys(perPersona))
  for (const item of perPersona[id]) if (!unionMap.has(keyOf(item))) unionMap.set(keyOf(item), item);
const unionPool = [...unionMap.values()];
console.log(`POOLS  amara=${perPersona.amara.length} dmitri=${perPersona.dmitri.length} yuki=${perPersona.yuki.length} union=${unionPool.length}`);

// ---- run 1: shipping behaviour (own pools) ----------------------------
console.log("\n=== RUN A: own pool (what ships) ===");
const ownRows: Record<string, Row[]> = {};
for (const id of Object.keys(perPersona)) {
  const { plan, rows } = run(id, perPersona[id]);
  ownRows[id] = rows;
  console.log(`\n[${id}] weeks=${plan.length} items=${rows.length} unique=${new Set(rows.map(r => r.name)).size}`);
  if (plan.length !== 12) fail(`${id}: expected 12 weeks, got ${plan.length}`);
  if (rows.length !== 36) fail(`${id}: expected 36 items, got ${rows.length}`);
  if (new Set(rows.map(r => r.name)).size !== rows.length) fail(`${id}: duplicate items across the plan`);
  const hist: Record<string, number> = {};
  for (const r of rows) hist[r.category] = (hist[r.category] ?? 0) + 1;
  console.log(`  domains: ${JSON.stringify(hist)}`);
  for (const r of rows) console.log(`  W${String(r.week).padStart(2,"0")} ${r.category.padEnd(9)} ${r.name}  [${r.tags.join(",")}]`);
}

// ---- run 2: THE DECISIVE TEST — identical pool, different users -------
console.log("\n=== RUN B: union pool, all three users (engine-only test) ===");
const uniRows: Record<string, Row[]> = {};
for (const id of ["amara", "dmitri", "yuki"]) {
  const { rows } = run(id, unionPool);
  uniRows[id] = rows;
  console.log(`[${id}] first 9: ${rows.slice(0, 9).map(r => r.name).join(" | ")}`);
}
for (const [a, b] of [["amara","dmitri"],["amara","yuki"],["dmitri","yuki"]] as const) {
  const A = new Set(uniRows[a].map(r => r.name)), B = new Set(uniRows[b].map(r => r.name));
  const shared = [...A].filter(n => B.has(n)).length;
  const jac = shared / (A.size + B.size - shared);
  console.log(`  ${a} vs ${b}: shared=${shared}/36  jaccard=${jac.toFixed(2)}`);
  if (shared === 36) fail(`${a} and ${b} produced identical plans from the same pool — user prefs ignored`);
}

// ---- run 3: determinism ------------------------------------------------
const a1 = JSON.stringify(run("yuki", perPersona.yuki).rows);
const a2 = JSON.stringify(run("yuki", perPersona.yuki).rows);
a1 === a2 ? pass("deterministic (two identical runs)") : fail("non-deterministic output");

// ---- run 4: Yuki hard-constraint audit, as a test not a log ------------
console.log("\n=== RUN C: Yuki constraint audit ===");
const MEAT = ["meat","chicken","beef","pork","seafood","fish","suya","churrasco","barbecue","bbq"];
const VEG  = ["vegetarian","vegan","veg","plant-based","plant"];
const STEP = ["step-free","accessible","barrier-free","wheelchair"];
const BAD  = ["stairs","stair","rough terrain","unpaved","no wheelchair"];
for (const r of ownRows.yuki) {
  if (!["food","places"].includes(r.category)) continue;
  const t = r.tags.map(x => x.toLowerCase());
  const meat = t.some(x => MEAT.some(m => x.includes(m)));
  const veg  = t.some(x => VEG.some(v => x.includes(v)));
  const step = t.some(x => STEP.some(s => x.includes(s)));
  const bad  = t.some(x => BAD.some(s => x.includes(s)));
  const isFood = r.category === "food";
  const line = `${r.category} "${r.name}" [${t.join(",")}] veg=${veg} meat=${meat} stepFree=${step} inaccessible=${bad}`;
  if (isFood && meat) fail(`Yuki food item contains a meat tag: ${line}`);
  else if (isFood && !veg) fail(`Yuki food item has NO positive vegetarian signal: ${line}`);
  else if (!isFood && bad) fail(`Yuki place is marked inaccessible: ${line}`);
  else if (!isFood && !step) console.log(`  WARN  place without accessibility signal: ${line}`);
  else pass(line);
}

console.log(`\nRESULT: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
