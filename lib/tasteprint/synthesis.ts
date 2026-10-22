import type { ResolvedLove, CrossDomainRecommendation, TasteprintPortrait } from "./types.ts";

export interface SemanticCluster {
  themeName: string;
  keywords: string[];
  description: string;
}

export const CULTURAL_CLUSTERS: SemanticCluster[] = [
  {
    themeName: "Resistance & Social Defiance",
    keywords: [
      "protest songs", "political activism", "antihero", "rebellion", "counterculture",
      "anti-corruption", "social justice", "revolutionary", "outspoken", "political",
      "politically conscious", "politically charged", "postcolonial", "moral decline",
      "anti-authoritarian", "defiance", "activism", "resistance"
    ],
    description: "A strong pull toward voices that question authority, reject complacency, and stand up against oppressive systems."
  },
  {
    themeName: "Rhythm & Kinetic Energy",
    keywords: [
      "rhythmic", "energetic", "funky", "pulse", "movement", "dance", "activewear",
      "performance", "high energy", "afrobeat", "groove", "tempo", "dynamic", "flow"
    ],
    description: "An instinct for motion, pulse, and visceral physical or sonic momentum that keeps things alive."
  },
  {
    themeName: "Grit & Psychological Depth",
    keywords: [
      "grit", "crime", "drama", "suspense", "tragedy", "high tension", "hard bop",
      "struggle", "underdog", "intensity", "dark comedy", "complex", "provocative", "noir"
    ],
    description: "An appreciation for stories and works that refuse easy sentimentality, delving instead into human complexity and friction."
  },
  {
    themeName: "Cultural Heritage & Identity",
    keywords: [
      "african traditions", "postcolonial fiction", "west african", "heritage", "folklore",
      "urban culture", "identity & belonging", "immigration narratives", "nigerian",
      "streetwear", "subculture", "local culture", "indigenous", "tradition"
    ],
    description: "A deep resonance with roots, geographical context, and distinct cultural lineage over homogenized trends."
  },
  {
    themeName: "Visionary Craft & Innovation",
    keywords: [
      "innovative", "charismatic", "mastery", "experimental", "creativity", "original",
      "studio ghibli", "auteur", "craftsmanship", "groundbreaking", "independent cinema"
    ],
    description: "Drawn to singular creative visions, uncompromising artistic standards, and distinctive execution."
  },
  {
    themeName: "Soul & Emotional Warmth",
    keywords: [
      "soulful", "passionate", "warmth", "devoted", "comfort food", "intimate",
      "nostalgic", "coming of age", "humanity", "empathy", "community"
    ],
    description: "An affinity for genuine human warmth, emotional resonance, and work that touches heart and gut."
  }
];

export function synthesizeTasteprint(
  loves: ResolvedLove[],
  recommendations: CrossDomainRecommendation[]
): TasteprintPortrait {
  // Collect all genuine tags from both the 4 seeds and the recommendations
  const seedTagMap = new Map<string, Set<string>>(); // seedName -> Set of lowercase tags

  for (const love of loves) {
    if (!seedTagMap.has(love.name)) {
      seedTagMap.set(love.name, new Set());
    }
    const tagSet = seedTagMap.get(love.name)!;
    love.tags.forEach((t) => tagSet.add(t.toLowerCase()));
  }

  // Add recommendation tags to their originating source seed's taste envelope
  for (const rec of recommendations) {
    if (seedTagMap.has(rec.sourceSeed)) {
      const tagSet = seedTagMap.get(rec.sourceSeed)!;
      rec.tags.forEach((t) => tagSet.add(t.toLowerCase()));
    }
  }

  // Match against semantic clusters honestly
  const scoredClusters: Array<{
    theme: string;
    description: string;
    count: number;
    originSeeds: string[];
    sampleTags: string[];
  }> = [];

  for (const cluster of CULTURAL_CLUSTERS) {
    const contributingSeeds = new Set<string>();
    const matchedTags = new Set<string>();

    for (const [seedName, tags] of seedTagMap.entries()) {
      for (const keyword of cluster.keywords) {
        // Exact or substring match of genuine Qloo tags
        for (const tag of tags) {
          if (tag === keyword || tag.includes(keyword) || keyword.includes(tag)) {
            contributingSeeds.add(seedName);
            matchedTags.add(tag);
          }
        }
      }
    }

    if (contributingSeeds.size > 0) {
      scoredClusters.push({
        theme: cluster.themeName,
        description: cluster.description,
        count: contributingSeeds.size,
        originSeeds: Array.from(contributingSeeds),
        sampleTags: Array.from(matchedTags).slice(0, 5),
      });
    }
  }

  // Sort clusters: highest seed count first, then by number of sample tags
  scoredClusters.sort((a, b) => b.count - a.count || b.sampleTags.length - a.sampleTags.length);

  // Take the top 3-4 recurring themes
  const topThemes = scoredClusters.slice(0, 3).map((c) => ({
    theme: c.theme,
    count: c.count,
    originSeeds: c.originSeeds,
    sampleTags: c.sampleTags,
  }));

  // Determine an evocative cultural archetype title
  const archetype = determineArchetype(topThemes.map((t) => t.theme));

  // Construct warm, plain-prose portrait (no fake marketing fluff, grounded strictly in their seeds)
  const lovesNames = loves.map((l) => l.name);
  const themesList = topThemes.map((t) => `"${t.theme}"`).join(", ");
  
  const headline = topThemes.length > 0
    ? `Drawn to ${topThemes[0].theme.toLowerCase()} with a strong pulse of ${topThemes[1]?.theme.toLowerCase() || "artistic conviction"}.`
    : `A singular blend of cultural conviction and creative depth.`;

  const themeParagraphs = topThemes.map((t) => {
    const seedGrammar = t.originSeeds.length === 1
      ? `anchored through your appreciation of ${t.originSeeds[0]}`
      : `emerging in harmony between ${t.originSeeds.join(" and ")}`;
    return `• **${t.theme}**: ${seedGrammar}. Real taste markers detected: ${t.sampleTags.map(tag => `*${tag}*`).join(", ")}.`;
  }).join("\n\n");

  const proseSummary = `Your four favorites — **${lovesNames.join("**, **")}** — reveal a coherent taste signature. Rather than arbitrary entertainment, your choices center around ${themesList}.\n\n${themeParagraphs}\n\nYour taste does not live in silos: the same instinct that draws you to ${lovesNames[0] || "your favorites"} is what creates your natural appetite for thoughtful literature, immersive cinema, and authentic local spaces.`;

  return {
    archetype,
    headline,
    topThemes,
    proseSummary,
    generatedAt: new Date().toISOString(),
    loves: lovesNames,
  };
}

function determineArchetype(themes: string[]): string {
  const tStr = themes.join(" ").toLowerCase();
  if (tStr.includes("resistance") && tStr.includes("rhythm")) {
    return "The High-Frequency Rebel";
  }
  if (tStr.includes("resistance") && tStr.includes("heritage")) {
    return "The Sovereign Polymath";
  }
  if (tStr.includes("grit") && tStr.includes("innovation")) {
    return "The Gritty Aesthete";
  }
  if (tStr.includes("soul") && tStr.includes("heritage")) {
    return "The Cultural Luminary";
  }
  if (tStr.includes("rhythm") && tStr.includes("energy")) {
    return "The Kinetic Pioneer";
  }
  return "The Thoughtful Iconoclast";
}
