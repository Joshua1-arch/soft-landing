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

async function qfetch(url: string) {
  const res = await fetch(url, {
    headers: { "X-Api-Key": API_KEY!, Accept: "application/json" }
  });
  const data = await res.json();
  return data;
}

async function searchEntity(query: string, type: string) {
  const sp = new URLSearchParams({ query, types: type, take: "1" });
  const data = await qfetch(`${BASE_URL}/search?${sp.toString()}`);
  return data?.results?.[0] || null;
}

async function runCompare(idA: string, idB: string, type: string) {
  const sp = new URLSearchParams({
    "a.signal.interests.entities": idA,
    "b.signal.interests.entities": idB,
    "filter.type": type,
    take: "5",
  });
  const data = await qfetch(`${BASE_URL}/v2/analysis/compare?${sp.toString()}`);
  return data?.results?.tags || [];
}

async function run() {
  console.log("Testing specific food compare...");
  const tk = await searchEntity("Terra Kulture", "urn:entity:place");
  const sw = await searchEntity("Spice World Manchester", "urn:entity:place");
  console.log("Terra Kulture:", tk?.name, tk?.entity_id);
  console.log("Spice World:", sw?.name, sw?.entity_id);

  if (tk && sw) {
    const tags = await runCompare(tk.entity_id, sw.entity_id, "urn:entity:place");
    console.log("Tags returned:", tags.length);
    for (const t of tags) {
      console.log(`  - ${t.name} (${t.subtype}) -> Score: ${t.query?.score}`);
    }
  }
}

run();
