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
    take: "12",
  });
  const iUrl = `${BASE_URL}/v2/insights?${sp.toString()}`;
  const iRes = await fetch(iUrl, { headers: { "X-Api-Key": API_KEY!, Accept: "application/json" } });
  const iData = await iRes.json();
  const rawEntities = iData.results?.entities || [];

  for (let i = 0; i < rawEntities.length; i++) {
    const e = rawEntities[i];
    console.log(`[#${i+1}] ${e.name} | Primary Genre: "${e.properties?.primary_genre?.name || "none"}" | Cuisine: ${Boolean(e.properties?.cuisine_description)} | Tags: ${(e.tags || []).slice(0, 5).map((t:any) => t.name || t.id).join(", ")}`);
  }
}
main();
