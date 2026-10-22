import fs from "node:fs";
import path from "node:path";

// Load .env.local
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
  console.log("Diagnosing Qloo place insights for Yuki (anchor Haruki Murakami -> Toronto)...");

  // First search Haruki Murakami
  const searchUrl = `${BASE_URL}/search?query=Haruki%20Murakami&types=urn:entity:author&take=1`;
  const sRes = await fetch(searchUrl, { headers: { "X-Api-Key": API_KEY!, Accept: "application/json" } });
  const sData = await sRes.json();
  const murakamiId = sData.results?.[0]?.entity_id || sData.results?.[0]?.id;
  console.log("Haruki Murakami Entity ID:", murakamiId);

  // Insights for places in Toronto
  const sp = new URLSearchParams({
    "filter.type": "urn:entity:place",
    "signal.interests.entities": murakamiId,
    "filter.location.query": "Toronto",
    take: "30",
  });
  const iUrl = `${BASE_URL}/v2/insights?${sp.toString()}`;
  const iRes = await fetch(iUrl, { headers: { "X-Api-Key": API_KEY!, Accept: "application/json" } });
  const iData = await iRes.json();
  const rawEntities = iData.results?.entities || [];

  console.log(`Found ${rawEntities.length} places in Toronto.`);
  for (let i = 0; i < rawEntities.length; i++) {
    const e = rawEntities[i];
    console.log(`\n--- Place #${i + 1}: ${e.name} ---`);
    console.log(`  entity_id: ${e.entity_id || e.id}`);
    console.log(`  primary_genre:`, e.properties?.primary_genre || e.primary_genre || "none");
    console.log(`  subtypes / types:`, e.types || e.subtypes || e.properties?.types || "none");
    console.log(`  tags:`, JSON.stringify(e.tags || []));
    console.log(`  properties keys:`, Object.keys(e.properties || {}));
    if (e.properties?.cuisine) console.log(`  cuisine:`, e.properties.cuisine);
    if (e.properties?.category) console.log(`  category:`, e.properties.category);
    if (e.properties?.short_description) console.log(`  short_desc:`, e.properties.short_description);
  }
}

main().catch(console.error);
