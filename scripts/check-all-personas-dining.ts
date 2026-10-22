import fs from "node:fs";
import path from "node:path";

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

const API_KEY = process.env.QLOO_API_KEY;
const BASE_URL = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";

async function checkCity(name: string, anchorQuery: string, anchorType: string, city: string) {
  const sRes = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(anchorQuery)}&types=${anchorType}&take=1`, {
    headers: { "X-Api-Key": API_KEY!, Accept: "application/json" }
  });
  const sData = await sRes.json();
  const anchorId = sData.results?.[0]?.entity_id || sData.results?.[0]?.id;

  const sp = new URLSearchParams({
    "filter.type": "urn:entity:place",
    "signal.interests.entities": anchorId,
    "filter.location.query": city,
    take: "40",
  });
  const iRes = await fetch(`${BASE_URL}/v2/insights?${sp.toString()}`, {
    headers: { "X-Api-Key": API_KEY!, Accept: "application/json" }
  });
  const iData = await iRes.json();
  const rawEntities = iData.results?.entities || [];

  console.log(`\n=== ${name} (${city}) Places (${rawEntities.length}) ===`);
  const diningGenres = new Set([
    "restaurant", "cafe", "coffee shop", "bar", "pub", "brewery", "sake brewery",
    "pizzeria", "ice cream shop", "bakery", "bistro", "diner", "food hall", "eatery",
    "gastropub", "delicatessen", "teahouse", "cocktail bar", "wine bar"
  ]);

  const dining = [];
  const nonDining = [];

  for (const e of rawEntities) {
    const g = (e.properties?.primary_genre?.name || "").toLowerCase().trim();
    const hasCuisine = Boolean(e.properties?.cuisine_description);
    const tags = (e.tags || []).map((t: any) => (t.name || t.id || t || "").toLowerCase());
    const isDining = diningGenres.has(g) || (hasCuisine && !g.includes("museum") && !g.includes("tower") && !g.includes("hotel") && !g.includes("airport"));
    if (isDining) {
      dining.push(`${e.name} [genre: "${e.properties?.primary_genre?.name || "none"}"]`);
    } else {
      nonDining.push(`${e.name} [genre: "${e.properties?.primary_genre?.name || "none"}"]`);
    }
  }

  console.log(`DINING PLACES FOUND (${dining.length}):`);
  dining.forEach(d => console.log("  - " + d));
  console.log(`NON-DINING PLACES (${nonDining.length}):`);
  nonDining.slice(0, 5).forEach(nd => console.log("  - " + nd));
}

async function run() {
  await checkCity("Amara", "Fela Kuti", "urn:entity:artist", "Manchester");
  await checkCity("Dmitri", "Antonio Carlos Jobim", "urn:entity:artist", "Kyoto");
}

run();
