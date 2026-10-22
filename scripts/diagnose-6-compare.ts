import fs from "node:fs";
import path from "node:path";
import { PERSONAS } from "../lib/qloo/fixtures/personas.ts";

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
  if (!res.ok) {
    return { ok: false, status: res.status, data: null };
  }
  const data = await res.json();
  return { ok: true, status: res.status, data };
}

async function searchEntity(query: string, type: string) {
  const sp = new URLSearchParams({ query, types: type, take: "1" });
  const res = await qfetch(`${BASE_URL}/search?${sp.toString()}`);
  const results = res.data?.results || [];
  return results[0] || null;
}

async function getTopDestEntity(city: string, type: string, anchorId: string) {
  const sp = new URLSearchParams({
    "filter.type": type,
    "signal.interests.entities": anchorId,
    "filter.location.query": city,
    take: "1",
  });
  const res = await qfetch(`${BASE_URL}/v2/insights?${sp.toString()}`);
  const entities = res.data?.results?.entities || (Array.isArray(res.data?.results) ? res.data.results : []);
  return entities[0] || null;
}

async function runCompare(idA: string, idB: string, type: string) {
  const sp = new URLSearchParams({
    "a.signal.interests.entities": idA,
    "b.signal.interests.entities": idB,
    "filter.type": type,
    take: "5",
  });
  const res = await qfetch(`${BASE_URL}/v2/analysis/compare?${sp.toString()}`);
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, tags: [] };
  }
  const tags = res.data?.results?.tags || [];
  return { tags };
}

async function main() {
  const amara = PERSONAS.amara;
  console.log(`Diagnosing 6 real compare calls for ${amara.name} (Origin: ${amara.origin} -> Destination: ${amara.destination})...`);
  console.log(`Anchors:`, amara.anchors);

  // 1. Resolve Music Anchor (Fela Kuti)
  const fela = await searchEntity("Fela Kuti", "urn:entity:artist");
  console.log("Music Anchor:", fela?.name, fela?.entity_id);

  // For Amara's categories:
  // Music: anchor = Fela Kuti
  // Film: anchor search "Half of a Yellow Sun" or "Nollywood" or "Lionheart"
  // Books: anchor search "Things Fall Apart" or "Chinua Achebe"
  // Podcasts: anchor search "Afrobeats" podcast or "The Daily"
  // Places: anchor search "Lagos" or "Terra Kulture"
  // Food: anchor search "Jollof" or "Nigerian restaurant" or Lagos dining

  const domains = [
    { cat: "music", type: "urn:entity:artist", originQuery: "Fela Kuti" },
    { cat: "film", type: "urn:entity:movie", originQuery: "Lionheart" },
    { cat: "books", type: "urn:entity:book", originQuery: "Things Fall Apart" },
    { cat: "podcasts", type: "urn:entity:podcast", originQuery: "Afrobeats Intelligence" },
    { cat: "food", type: "urn:entity:place", originQuery: "Terra Kulture" },
    { cat: "places", type: "urn:entity:place", originQuery: "Lagos" },
  ];

  for (const d of domains) {
    console.log(`\n======================================================`);
    console.log(`DOMAIN: ${d.cat.toUpperCase()} (filter.type: ${d.type})`);
    
    // Resolve origin representative
    const originRep = await searchEntity(d.originQuery, d.type);
    console.log(`  Origin Rep (${d.originQuery}):`, originRep ? `${originRep.name} (${originRep.entity_id})` : "NOT FOUND");

    // Resolve dest representative in Manchester
    let destRep = null;
    if (d.type === "urn:entity:place") {
      destRep = await getTopDestEntity("Manchester", d.type, fela.entity_id);
    } else {
      // Find Manchester representative
      const manchesterSearch = await searchEntity("Manchester", d.type);
      destRep = manchesterSearch;
    }
    console.log(`  Dest Rep:`, destRep ? `${destRep.name} (${destRep.entity_id})` : "NOT FOUND");

    if (originRep && destRep) {
      const cmp = await runCompare(originRep.entity_id, destRep.entity_id, d.type);
      console.log(`  Compare Tags Count: ${cmp.tags.length}`);
      for (const t of cmp.tags) {
        console.log(`    - Tag: "${t.name}" | Subtype: "${t.subtype || "none"}" | Score: ${t.query?.score}`);
      }
    }
  }
}

main().catch(console.error);
