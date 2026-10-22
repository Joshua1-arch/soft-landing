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
  if (!res.ok) return null;
  return await res.json();
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

const genericTags = new Set(["place", "tourist attraction", "destination", "point of interest", "establishment"]);

function computeOverlap(tags: any[]) {
  if (!tags || tags.length === 0) return { overlap: 0.0, hasData: false, tagList: [] };
  const evaluated = tags.slice(0, 5);
  let sum = 0;
  const tagList = [];
  for (const t of evaluated) {
    const name = (t.name || "").toLowerCase().trim();
    const isGeneric = genericTags.has(name) || t.subtype === "urn:tag:genre:place";
    const weight = isGeneric ? 0.25 : 1.0;
    sum += weight;
    tagList.push({ name: t.name, subtype: t.subtype, weight });
  }
  const overlap = Math.min(1.0, Math.round((sum / 5) * 100) / 100);
  return { overlap, hasData: true, tagList };
}

async function evaluatePersona(personaId: string) {
  const persona = PERSONAS[personaId];
  const originCity = persona.origin.split(",")[0].trim();
  const destCity = persona.destination.split(",")[0].trim();

  console.log(`\n======================================================`);
  console.log(`PERSONA: ${persona.name.toUpperCase()} (${originCity} -> ${destCity})`);

  const categoryConfigs: Record<string, Record<string, { type: string; originSearch: string; destSearch?: string }>> = {
    amara: {
      music: { type: "urn:entity:artist", originSearch: "Fela Kuti", destSearch: "Oasis" },
      film: { type: "urn:entity:movie", originSearch: "Lionheart", destSearch: "Manchester by the Sea" },
      books: { type: "urn:entity:book", originSearch: "Things Fall Apart", destSearch: "Mary Barton" },
      podcasts: { type: "urn:entity:podcast", originSearch: "Intelligence Matters", destSearch: "Manchester United Podcast" },
      food: { type: "urn:entity:place", originSearch: "Terra Kulture", destSearch: "Spice World" },
      places: { type: "urn:entity:place", originSearch: "Lagos", destSearch: "Manchester" },
    },
    dmitri: {
      music: { type: "urn:entity:artist", originSearch: "Antonio Carlos Jobim", destSearch: "Kyoto Jazz Massive" },
      film: { type: "urn:entity:movie", originSearch: "City of God", destSearch: "Rashomon" },
      books: { type: "urn:entity:book", originSearch: "The Hour of the Star", destSearch: "The Old Capital" },
      podcasts: { type: "urn:entity:podcast", originSearch: "Brazilian", destSearch: "Kyoto" },
      food: { type: "urn:entity:place", originSearch: "Churrascaria Palace", destSearch: "Gion Kappa Restaurant" },
      places: { type: "urn:entity:place", originSearch: "Rio de Janeiro", destSearch: "Kyoto" },
    },
    yuki: {
      music: { type: "urn:entity:artist", originSearch: "Ryuichi Sakamoto", destSearch: "Glenn Gould" },
      film: { type: "urn:entity:movie", originSearch: "Drive My Car", destSearch: "Scott Pilgrim vs. the World" },
      books: { type: "urn:entity:book", originSearch: "Norwegian Wood", destSearch: "The Handmaid's Tale" },
      podcasts: { type: "urn:entity:podcast", originSearch: "Tokyo", destSearch: "Toronto" },
      food: { type: "urn:entity:place", originSearch: "Sukiyabashi Jiro", destSearch: "Burwash Dining Hall" },
      places: { type: "urn:entity:place", originSearch: "Tokyo", destSearch: "Toronto" },
    },
  };

  const categories = ["music", "food", "film", "books", "podcasts", "places"] as const;

  for (const cat of categories) {
    const cfg = categoryConfigs[personaId][cat];
    const originEntity = await searchEntity(cfg.originSearch, cfg.type);
    const destEntity = await searchEntity(cfg.destSearch || destCity, cfg.type);

    if (!originEntity || !destEntity) {
      console.log(`[${cat.toUpperCase()}] MISSING ENTITY -> Overlap: 0.0 (Not enough data)`);
      continue;
    }

    const rawTags = await runCompare(originEntity.entity_id, destEntity.entity_id, cfg.type);
    const result = computeOverlap(rawTags);

    console.log(`\n--- [${cat.toUpperCase()}] ${originEntity.name} vs ${destEntity.name} ---`);
    console.log(`  Raw Tags Count: ${rawTags.length}`);
    for (const t of result.tagList) {
      console.log(`    - "${t.name}" [${t.subtype || "none"}] -> weight ${t.weight}`);
    }
    console.log(`  Overlap: ${result.overlap} (hasData: ${result.hasData})`);
    if (result.hasData) {
      console.log(`  Arithmetic: min(1.0, (${result.tagList.map(t => t.weight).join(" + ")}) / 5) = ${result.overlap}`);
    }
  }
}

async function main() {
  await evaluatePersona("dmitri");
  await evaluatePersona("yuki");
}

main().catch(console.error);
