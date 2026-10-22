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

async function main() {
  const searchUrl = `${BASE_URL}/search?query=Haruki%20Murakami&types=urn:entity:author&take=1`;
  const sRes = await fetch(searchUrl, { headers: { "X-Api-Key": API_KEY!, Accept: "application/json" } });
  const sData = await sRes.json();
  const murakamiId = sData.results?.[0]?.entity_id || sData.results?.[0]?.id;

  const sp = new URLSearchParams({
    "filter.type": "urn:entity:place",
    "signal.interests.entities": murakamiId,
    "filter.location.query": "Toronto",
    take: "40",
  });
  const iUrl = `${BASE_URL}/v2/insights?${sp.toString()}`;
  const iRes = await fetch(iUrl, { headers: { "X-Api-Key": API_KEY!, Accept: "application/json" } });
  const iData = await iRes.json();
  const rawEntities = iData.results?.entities || [];

  console.log(`\n=== YUKI (TORONTO) ALL ${rawEntities.length} PLACES FROM QLOO INSIGHTS ===\n`);
  for (let i = 0; i < rawEntities.length; i++) {
    const e = rawEntities[i];
    const genre = e.properties?.primary_genre?.name || "none";
    const tags = (e.tags || []).map((t: any) => t.name || t.id || t);
    const tagNames = tags.join(", ");
    const foodKeywords = ["restaurant", "cafe", "coffee", "bakery", "bar", "pub", "bistro", "eatery", "kitchen", "diner", "dining", "brewery", "takeaway", "lunch", "brunch", "ramen", "sushi", "pizza", "food"];
    const matchingTags = tags.filter((t: string) => foodKeywords.some(k => t.toLowerCase().includes(k)));
    const hasMenu = Boolean(e.properties?.menu_url);
    const cuisineDesc = e.properties?.cuisine_description || "";

    console.log(`[#${i+1}] ${e.name}`);
    console.log(`    Primary Genre: "${genre}"`);
    console.log(`    Menu URL: ${hasMenu ? e.properties.menu_url : "none"}`);
    console.log(`    Cuisine Desc: ${cuisineDesc ? cuisineDesc.slice(0, 80) + "..." : "none"}`);
    console.log(`    Matching Food Tags (${matchingTags.length}): [${matchingTags.slice(0, 6).join("; ")}]`);
    console.log(`    All Tags (${tags.length}): ${tags.slice(0, 5).join(", ")}...`);
  }
}

main().catch(console.error);
