import fs from "node:fs";
import path from "node:path";

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

const API_KEY = process.env.QLOO_API_KEY;
const BASE_URL = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";

if (!API_KEY) {
  console.error("FATAL: QLOO_API_KEY is not defined in .env.local");
  process.exit(1);
}

async function callQloo(endpoint: string, params: Record<string, string | number | boolean>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    sp.append(k, String(v));
  }
  const url = `${BASE_URL}${endpoint}?${sp.toString()}`;
  console.log(`\n======================================================`);
  console.log(`REQUEST: GET ${url} [Header X-Api-Key: REDACTED]`);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": API_KEY!,
        Accept: "application/json",
      },
    });

    const text = await res.text();
    console.log(`STATUS: ${res.status} ${res.statusText}`);
    let parsed: any;
    try {
      parsed = JSON.parse(text);
      console.log(`BODY:\n${JSON.stringify(parsed, null, 2)}`);
    } catch {
      console.log(`RAW TEXT BODY:\n${text}`);
    }

    if (!res.ok) {
      console.log(`RESULT: FAILED-HTTP-${res.status}`);
    } else if (Array.isArray(parsed) && parsed.length === 0) {
      console.log(`RESULT: FAILED-EMPTY-ARRAY`);
    } else if (parsed?.results && Array.isArray(parsed.results) && parsed.results.length === 0) {
      console.log(`RESULT: FAILED-EMPTY-RESULTS`);
    } else {
      console.log(`RESULT: SUCCESS`);
    }

    return { status: res.status, data: parsed };
  } catch (err: any) {
    console.log(`ERROR: ${err.message}`);
    console.log(`RESULT: FAILED-NETWORK`);
    return { status: 0, error: err.message };
  }
}

async function runVerification() {
  console.log("=== QLOO LIVE API VERIFICATION SUITE ===");
  console.log(`Base URL: ${BASE_URL}`);

  // (a) /search for anchors from each persona
  console.log("\n--- (a) /search Verification ---");
  const search1 = await callQloo("/search", {
    query: "Fela Kuti",
    types: "urn:entity:artist",
    take: 3,
  });

  const search2 = await callQloo("/search", {
    query: "Bossa Nova",
    types: "urn:entity:genre", // or generic/artist
    take: 3,
  });

  // If genre isn't in search types, let's also search an artist for Dmitri: Caetano Veloso or Antonio Carlos Jobim
  const search2b = await callQloo("/search", {
    query: "Caetano Veloso",
    types: "urn:entity:artist",
    take: 3,
  });

  const search3 = await callQloo("/search", {
    query: "Studio Ghibli",
    types: "urn:entity:brand", // Studio Ghibli is brand / company or movie studio
    take: 3,
  });

  // Extract a real entity ID for Fela Kuti
  let felaId = "";
  const felaEntities = Array.isArray(search1.data)
    ? search1.data
    : search1.data?.results || search1.data?.entities || [];
  if (felaEntities.length > 0) {
    felaId = felaEntities[0].id || felaEntities[0].entity_id;
  }
  console.log(`\nRESOLVED Fela Kuti Entity ID: ${felaId}`);

  // Extract a second real entity ID for compare
  let secondId = "";
  const secondEntities = Array.isArray(search2b.data)
    ? search2b.data
    : search2b.data?.results || search2b.data?.entities || [];
  if (secondEntities.length > 0) {
    secondId = secondEntities[0].id || secondEntities[0].entity_id;
  }
  console.log(`RESOLVED Second Entity ID (Caetano Veloso): ${secondId}`);

  // (b) /v2/tags with filter.query
  console.log("\n--- (b) /v2/tags Verification ---");
  await callQloo("/v2/tags", {
    "filter.query": "jollof",
    take: 3,
  });

  await callQloo("/v2/tags", {
    "filter.query": "vegetarian",
    take: 3,
  });

  await callQloo("/v2/tags", {
    "filter.query": "city-pop",
    take: 3,
  });

  // (c) /v2/insights with filter.type=urn:entity:artist + explainability
  console.log("\n--- (c) /v2/insights (Artist + Explainability) ---");
  if (felaId) {
    await callQloo("/v2/insights", {
      "filter.type": "urn:entity:artist",
      "signal.interests.entities": felaId,
      "feature.explainability": "true",
      take: 5,
    });
  } else {
    console.log("SKIPPED (c) because Fela Kuti entity ID could not be resolved");
  }

  // (d) /v2/insights with filter.type=urn:entity:place and filter.location.query=Manchester
  console.log("\n--- (d) /v2/insights (Places with filter.location.query) ---");
  await callQloo("/v2/insights", {
    "filter.type": "urn:entity:place",
    "filter.location.query": "Manchester",
    "signal.interests.entities": felaId || "dummy",
    take: 5,
  });

  // (e) /v2/analysis/compare with a.signal.interests.entities and b.signal.interests.entities
  console.log("\n--- (e) /v2/analysis/compare Verification ---");
  if (felaId && secondId) {
    await callQloo("/v2/analysis/compare", {
      "a.signal.interests.entities": felaId,
      "b.signal.interests.entities": secondId,
      "filter.type": "urn:entity:artist",
      take: 5,
    });
  } else {
    console.log("SKIPPED (e) because two entity IDs could not be resolved");
  }
}

runVerification();
