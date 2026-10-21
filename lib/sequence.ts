import type {
  DomainCategory,
  PlanItem,
  PlanWeek,
  UserPreferences,
  InsightResult,
} from "./qloo/types.ts";
import { computeTargetNovelty } from "./ramp.ts";

export const DOMAIN_QUOTAS: Record<DomainCategory, number> = {
  music: 8,
  food: 8,
  film: 7,
  books: 5,
  podcasts: 4,
  places: 4,
};

const CATEGORY_ICONS: Record<DomainCategory, string> = {
  music: "🎵",
  food: "🍲",
  film: "🎬",
  books: "📚",
  podcasts: "🎙️",
  places: "🏛️",
};

const WEEK_THEMES = [
  { title: "Tastes of Home, Close at Hand", summary: "High comfort (~80% familiar) — grounding into familiar roots before stepping outward." },
  { title: "The Shared Thread", summary: "Gentle expansion — diaspora voices and crossover spots that bridge your world with your new city." },
  { title: "Neighborhood Footing", summary: "Stepping into local daily habits, trusted markets, and celebrated local eateries." },
  { title: "Sounds of the Metro", summary: "Immerse in the host city's distinct musical heritage and community performance rooms." },
  { title: "The Local Kitchen", summary: "Expanding beyond comfort food to iconic regional delicacies and shared tables." },
  { title: "Cinematic Horizons", summary: "Local arthouse cinema, regional directors, and documentary retrospectives." },
  { title: "Literary Landmarks", summary: "Independent bookshops, local historic archives, and regional authors." },
  { title: "Curious Outings", summary: "Uncovering canal-side paths, historic courtyards, and local meeting spots." },
  { title: "Audio & Subcultures", summary: "Long-form city podcasts, subculture discussions, and regional storytelling." },
  { title: "Community Circles", summary: "Open reading salons, social culinary halls, and historic gathering points." },
  { title: "The Deep Dive", summary: "Embracing niche local traditions, distinct local dialects, and subcultural music." },
  { title: "A Place of Your Own", summary: "Balanced ~50% local immersion — comfortable navigating both your heritage and host city." },
];

export interface SequencingOptions {
  user: UserPreferences;
  candidatePool: InsightResult[];
  startWeek?: number; // default 1
  existingWeeks?: PlanWeek[]; // for partial re-planning
}

/**
 * Checks whether an item violates user hard constraints
 * E.g. vegetarian constraint violated if tagged "meat" or "churrasco" and not "vegetarian"
 */
function violatesHardConstraints(item: InsightResult, constraints: string[]): boolean {
  const tags = item.entity.tags.map((t) => t.toLowerCase());

  for (const c of constraints) {
    const constraint = c.toLowerCase();
    if (constraint === "vegetarian" || constraint === "vegan") {
      if (item.entity.category === "food") {
        const hasVeg = tags.some((t) => t.includes("veg") || t.includes("plant"));
        const hasMeat = tags.some((t) =>
          ["meat", "chicken", "beef", "pork", "seafood", "fish", "suya", "churrasco", "barbecue", "bbq"].some((m) =>
            t.includes(m)
          )
        );
        if (hasMeat || !hasVeg) return true;
      }
    }

    if (constraint === "limited mobility") {
      if (item.entity.category === "places") {
        const hasStepFree = tags.some((t) =>
          ["step-free", "accessible", "barrier-free", "wheelchair"].some((s) => t.includes(s))
        );
        const hasInaccessible = tags.some((t) =>
          ["stairs", "stair", "rough terrain", "unpaved", "no wheelchair"].some((b) => t.includes(b))
        );
        if (hasInaccessible || !hasStepFree) return true;
      }
    }

    if (constraint === "no horror") {
      if (tags.some((t) => t.includes("horror") || t.includes("slasher") || t.includes("gore"))) return true;
    }
  }

  return false;
}

/**
 * Calculates pairwise similarity between two items based on tag overlap
 */
function pairwiseTagSimilarity(a: InsightResult, b: InsightResult): number {
  const setA = new Set(a.entity.tags);
  let overlap = 0;
  for (const tag of b.entity.tags) {
    if (setA.has(tag)) overlap++;
  }
  return overlap;
}

/**
 * Computes cultural alignment between an item and a user's anchors/destination
 */
function computeUserCulturalAffinity(item: InsightResult, user: UserPreferences): number {
  let score = 0;
  const itemText = (
    item.entity.name +
    " " +
    (item.entity.subtitle || "") +
    " " +
    item.entity.tags.join(" ")
  ).toLowerCase();

  // Match against user anchors
  for (const anchor of user.anchors) {
    const aLower = anchor.toLowerCase();
    const words = aLower.split(" ").filter((w) => w.length > 2);
    if (itemText.includes(aLower)) {
      score += 1.0;
    } else if (words.some((w) => itemText.includes(w))) {
      score += 0.5;
    }
  }

  // Match against user origin city (heritage grounding)
  const originClean = user.originCity.split(",")[0].toLowerCase().trim();
  if (originClean && itemText.includes(originClean)) {
    score += 0.6;
  }

  // Match against user destination city (locality grounding)
  const destClean = user.destinationCity.split(",")[0].toLowerCase().trim();
  if (destClean && (item.entity.locality?.toLowerCase().includes(destClean) || itemText.includes(destClean))) {
    score += 0.8;
  }

  return score;
}

/**
 * Evaluates the cost of a triple of items for week w
 */
function scoreTriple(
  items: [InsightResult, InsightResult, InsightResult],
  week: number,
  targetNovelty: number,
  seenTags: Set<string>,
  domainCounts: Record<DomainCategory, number>,
  user: UserPreferences
): number {
  let cost = 0;

  // 1. Target novelty deviation and User Cultural Anchor Affinity
  for (const item of items) {
    // Check hard constraint violation
    if (violatesHardConstraints(item, user.constraints)) {
      return Infinity; // Hard constraint violated
    }

    // Cultural anchor affinity: items aligned with user anchors and destination have lower cost
    const affinity = computeUserCulturalAffinity(item, user);
    cost -= affinity * 0.45; // lower cost for culturally aligned items

    // Apply avoid tags / loved tags adjustments
    let adjustedNovelty = item.novelty;
    const itemTags = item.entity.tags;

    for (const tag of itemTags) {
      if (user.avoidTags.includes(tag)) {
        cost += 0.8; // Heavily penalise avoided tags
      }
      if (user.lovedTags.includes(tag)) {
        adjustedNovelty = Math.max(0, adjustedNovelty - 0.05); // slightly more familiar
      }
    }

    cost += Math.abs(adjustedNovelty - targetNovelty);

    // Apply temporary domain penalty (from feedback)
    const domainPenalty = user.penalizedDomains[item.entity.category] || 0;
    cost += domainPenalty;
  }

  // 2. Domain collision penalty (0.35 if any 2 items share same domain)
  const cats = new Set(items.map((i) => i.entity.category));
  if (cats.size < 3) {
    cost += 0.35 * (3 - cats.size);
  }

  // 3. Pairwise similarity between items in the week (0.15 * Σ similarity)
  const pairSim =
    pairwiseTagSimilarity(items[0], items[1]) +
    pairwiseTagSimilarity(items[0], items[2]) +
    pairwiseTagSimilarity(items[1], items[2]);
  cost += 0.15 * pairSim;

  // 4. Repeated tag penalty (0.50 if tag was seen in an earlier week)
  let repeatedTags = 0;
  for (const item of items) {
    for (const t of item.entity.tags) {
      if (seenTags.has(t)) repeatedTags++;
    }
  }
  cost += 0.50 * repeatedTags;

  // 5. Soft domain quota penalty
  for (const item of items) {
    const currentCount = domainCounts[item.entity.category] || 0;
    const quota = DOMAIN_QUOTAS[item.entity.category] || 6;
    if (currentCount >= quota) {
      cost += 0.25 * (currentCount - quota + 1);
    }
  }

  return cost;
}

/**
 * Formats an InsightResult into a PlanItem
 */
function toPlanItem(result: InsightResult, user: UserPreferences): PlanItem {
  const entity = result.entity;
  const searchUrl =
    entity.category === "music"
      ? `https://open.spotify.com/search/${encodeURIComponent(entity.name)}`
      : entity.category === "food" || entity.category === "places"
      ? `https://www.google.com/maps/search/${encodeURIComponent(entity.name + " " + (entity.locality || user.destinationCity))}`
      : entity.category === "books"
      ? `https://www.goodreads.com/search?q=${encodeURIComponent(entity.name)}`
      : `https://www.justwatch.com/us/search?q=${encodeURIComponent(entity.name)}`;

  return {
    id: entity.id,
    title: entity.name,
    subtitle: entity.subtitle || `${entity.category} in ${entity.locality || user.destinationCity}`,
    category: entity.category,
    categoryIcon: CATEGORY_ICONS[entity.category] || "✨",
    entity,
    novelty: result.novelty,
    familiarity: result.normalizedFamiliarity,
    rating: "unrated",
    explanation: result.explanation || [],
    searchUrl,
  };
}

/**
 * Deterministic sequencing engine that plans 12 weeks
 */
export function sequencePlan(options: SequencingOptions): PlanWeek[] {
  const { user, candidatePool, startWeek = 1, existingWeeks = [] } = options;
  const totalWeeks = 12;

  const weeks: PlanWeek[] = [];
  const usedItemIds = new Set<string>();
  const seenTags = new Set<string>();
  const domainCounts: Record<DomainCategory, number> = {
    music: 0,
    food: 0,
    film: 0,
    books: 0,
    podcasts: 0,
    places: 0,
  };

  // Preserve already rated / earlier weeks if partial re-planning
  if (startWeek > 1 && existingWeeks.length > 0) {
    for (let w = 1; w < startWeek; w++) {
      const existing = existingWeeks.find((ew) => ew.weekNumber === w);
      if (existing) {
        weeks.push(existing);
        for (const it of existing.items) {
          usedItemIds.add(it.id);
          domainCounts[it.category] = (domainCounts[it.category] || 0) + 1;
          for (const t of it.entity.tags) seenTags.add(t);
        }
      }
    }
  }

  // Filter pool to available unassigned candidates
  const availablePool = candidatePool.filter((c) => !usedItemIds.has(c.entity.id));

  for (let w = startWeek; w <= totalWeeks; w++) {
    const targetNovelty = computeTargetNovelty(w, user.adventure);
    const theme = WEEK_THEMES[w - 1] || { title: `Week ${w} Immersion`, summary: "Continued cultural progression" };

    // Choose best 3 candidates from unassigned pool
    const candidates = availablePool.filter((c) => !usedItemIds.has(c.entity.id));

    let bestTriple: [InsightResult, InsightResult, InsightResult] | null = null;
    let minCost = Infinity;

    // Search candidate pool systematically
    // If pool is large, limit search combinations deterministically
    const maxSearchPool = Math.min(candidates.length, 30);
    const poolSubset = candidates.slice(0, maxSearchPool);

    for (let i = 0; i < poolSubset.length - 2; i++) {
      for (let j = i + 1; j < poolSubset.length - 1; j++) {
        for (let k = j + 1; k < poolSubset.length; k++) {
          const triple: [InsightResult, InsightResult, InsightResult] = [
            poolSubset[i],
            poolSubset[j],
            poolSubset[k],
          ];

          const cost = scoreTriple(triple, w, targetNovelty, seenTags, domainCounts, user);
          if (cost < minCost) {
            minCost = cost;
            bestTriple = triple;
          }
        }
      }
    }

    // Fallback if no valid triple found under hard constraints
    if (!bestTriple || !bestTriple[0] || !bestTriple[1] || !bestTriple[2]) {
      const remaining = candidates.length >= 3 ? candidates : candidatePool;
      bestTriple = [
        remaining[0 % remaining.length],
        remaining[1 % remaining.length],
        remaining[2 % remaining.length],
      ];
    }

    // Assign items and update tracking sets
    const planItems: PlanItem[] = [];
    if (bestTriple) {
      for (const res of bestTriple) {
        if (!res || !res.entity) continue;
        usedItemIds.add(res.entity.id);
        domainCounts[res.entity.category] = (domainCounts[res.entity.category] || 0) + 1;
        for (const t of res.entity.tags) seenTags.add(t);
        planItems.push(toPlanItem(res, user));
      }
    }

    weeks.push({
      weekNumber: w,
      targetNovelty,
      themeTitle: theme.title,
      themeSummary: theme.summary,
      items: planItems,
      isExpanded: w === 1,
    });
  }

  return weeks;
}

/**
 * Dynamic Feedback Re-planning Handler
 * Applies feedback rules from spec and returns updated state & new sequence
 */
export function handleItemRating(
  currentWeeks: PlanWeek[],
  ratedWeekNumber: number,
  itemId: string,
  rating: "loved" | "notForMe",
  user: UserPreferences,
  candidatePool: InsightResult[]
): { updatedWeeks: PlanWeek[]; updatedUser: UserPreferences; toastMessage: string } {
  const updatedUser: UserPreferences = {
    ...user,
    lovedTags: [...user.lovedTags],
    avoidTags: [...user.avoidTags],
    penalizedDomains: { ...user.penalizedDomains },
  };

  // Find the rated item
  let ratedItem: PlanItem | undefined;
  for (const w of currentWeeks) {
    const found = w.items.find((i) => i.id === itemId);
    if (found) {
      ratedItem = found;
      found.rating = rating;
      break;
    }
  }

  let toastMessage = "";

  if (rating === "loved") {
    // loved → add item's top tags to user.affinities with weight +1, nudge A up by 0.03 (cap 100)
    if (ratedItem) {
      for (const t of ratedItem.entity.tags.slice(0, 3)) {
        if (!updatedUser.lovedTags.includes(t)) updatedUser.lovedTags.push(t);
      }
    }
    updatedUser.adventure = Math.min(100, updatedUser.adventure + 3);
    toastMessage = `Preference saved: Added tag affinity. Adventure level nudged to ${updatedUser.adventure}.`;
  } else {
    // notForMe → add tags to user.avoid with weight -1, penalise domain by 0.15 for next 2 weeks, nudge A down 0.03 (floor 0)
    if (ratedItem) {
      for (const t of ratedItem.entity.tags.slice(0, 3)) {
        if (!updatedUser.avoidTags.includes(t)) updatedUser.avoidTags.push(t);
      }
      updatedUser.penalizedDomains[ratedItem.category] = 0.15;
    }
    updatedUser.adventure = Math.max(0, updatedUser.adventure - 3);
    toastMessage = `Re-planned: Downweighted ${ratedItem?.category || "domain"} for subsequent weeks.`;
  }

  // Check if all 3 items in the current rated week are rated
  const ratedWeek = currentWeeks.find((w) => w.weekNumber === ratedWeekNumber);
  const allRated = ratedWeek && ratedWeek.items.every((it) => it.rating !== "unrated");

  let resequencedWeeks = currentWeeks;

  if (allRated && ratedWeekNumber < 12) {
    // Re-plan weeks > ratedWeekNumber only
    resequencedWeeks = sequencePlan({
      user: updatedUser,
      candidatePool,
      startWeek: ratedWeekNumber + 1,
      existingWeeks: currentWeeks,
    });

    // Expand next week
    const nextWeek = resequencedWeeks.find((w) => w.weekNumber === ratedWeekNumber + 1);
    if (nextWeek) nextWeek.isExpanded = true;

    toastMessage = `Re-planned: Week ${ratedWeekNumber + 1} unlocked with updated cultural weighting.`;
  }

  return {
    updatedWeeks: resequencedWeeks,
    updatedUser,
    toastMessage,
  };
}
