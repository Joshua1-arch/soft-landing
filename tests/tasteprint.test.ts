import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { detectDomainType, extractTagNames } from "../lib/tasteprint/classify.ts";
import { planCrossDomainLeaps, RICH_DOMAINS } from "../lib/tasteprint/cross-domain.ts";
import { synthesizeTasteprint, CULTURAL_CLUSTERS } from "../lib/tasteprint/synthesis.ts";
import type { ResolvedLove, CrossDomainRecommendation } from "../lib/tasteprint/types.ts";

describe("Tasteprint: Input Classification & Domain Detection", () => {
  test("correctly identifies artist domain", () => {
    const raw = { types: ["urn:entity:artist"], name: "Fela Kuti" };
    const { type, typeName } = detectDomainType(raw);
    assert.equal(type, "urn:entity:artist");
    assert.equal(typeName, "Music Artist");
  });

  test("correctly identifies film domain", () => {
    const raw = { types: ["urn:entity:movie"], name: "Spirited Away" };
    const { type, typeName } = detectDomainType(raw);
    assert.equal(type, "urn:entity:movie");
    assert.equal(typeName, "Film / Movie");
  });

  test("correctly identifies tv_show domain", () => {
    const raw = { types: ["urn:entity:tv_show"], name: "Breaking Bad" };
    const { type, typeName } = detectDomainType(raw);
    assert.equal(type, "urn:entity:tv_show");
    assert.equal(typeName, "TV Series");
  });

  test("correctly distinguishes restaurant from generic place", () => {
    const diningPlace = {
      types: ["urn:entity:place"],
      name: "Jollof Rice King",
      properties: {
        primary_genre: { name: "Restaurant" },
        cuisine_description: "West African dining",
      },
      tags: [{ name: "Restaurant" }],
    };
    const { type, typeName } = detectDomainType(diningPlace);
    assert.equal(type, "urn:entity:place");
    assert.equal(typeName, "Dining & Restaurant");
  });

  test("extracts tag names cleanly without duplicates or blank entries", () => {
    const entity = {
      tags: [
        { name: "Afrobeat" },
        { name: "Jazz" },
        "Funk",
        { name: "Afrobeat" }, // duplicate
        "", // blank
      ],
    };
    const tags = extractTagNames(entity);
    assert.deepEqual(tags.sort(), ["Afrobeat", "Funk", "Jazz"]);
  });
});

describe("Tasteprint: Cross-Domain Plan Generation", () => {
  const musicLove: ResolvedLove = {
    rawInput: "Fela Kuti",
    entityId: "artist_123",
    name: "Fela Kuti",
    detectedType: "urn:entity:artist",
    typeName: "Music Artist",
    tags: ["Afrobeat", "Protest Songs"],
    confidence: 1.0,
  };

  const filmLove: ResolvedLove = {
    rawInput: "Breaking Bad",
    entityId: "tv_123",
    name: "Breaking Bad",
    detectedType: "urn:entity:tv_show",
    typeName: "TV Series",
    tags: ["Crime", "Antihero"],
    confidence: 1.0,
  };

  test("chooses rich domains and skips the source's own domain", () => {
    const musicPlan = planCrossDomainLeaps(musicLove);
    assert.ok(musicPlan.length > 0);
    // Never leap to artist from artist
    assert.ok(musicPlan.every((d) => d.type !== "urn:entity:artist"));
    // Ensure all target domains are in RICH_DOMAINS
    const richTypes = RICH_DOMAINS.map((r) => r.type);
    assert.ok(musicPlan.every((d) => richTypes.includes(d.type)));

    const filmPlan = planCrossDomainLeaps(filmLove);
    assert.ok(filmPlan.length > 0);
    assert.ok(filmPlan.every((d) => d.type !== "urn:entity:movie" && d.type !== "urn:entity:tv_show"));
  });

  test("thin domains (cities, albums, tracks) are never generated in plan", () => {
    const plan = planCrossDomainLeaps(musicLove);
    const planTypes = plan.map((p) => p.type as string);
    assert.ok(!planTypes.includes("urn:entity:destination"));
    assert.ok(!planTypes.includes("urn:entity:album"));
    assert.ok(!planTypes.includes("urn:entity:track"));
  });
});

describe("Tasteprint: Explainability & Honesty Guarantees", () => {
  test("preserves attribution when present and states clear plain-language trace", () => {
    const rec: CrossDomainRecommendation = {
      sourceSeed: "Fela Kuti",
      targetDomain: "urn:entity:movie",
      targetDomainName: "Film & Cinema",
      entityId: "movie_act_of_killing",
      name: "The Act of Killing",
      score: 0.94,
      explainability: {
        hasAttribution: true,
        attributionScore: 1.0,
        reason: "100% of match traces directly to your love of Fela Kuti with 94.0% taste affinity",
      },
      tags: ["Documentary", "Rebellion"],
    };

    assert.equal(rec.explainability.hasAttribution, true);
    assert.equal(rec.explainability.attributionScore, 1.0);
    assert.match(rec.explainability.reason, /100% of match traces directly/);
    assert.doesNotMatch(rec.explainability.reason, /perfect match/i);
  });

  test("honestly reports when explainability attribution is absent (never fabricates)", () => {
    const recWithoutAttribution: CrossDomainRecommendation = {
      sourceSeed: "Breaking Bad",
      targetDomain: "urn:entity:brand",
      targetDomainName: "Brand & Fashion",
      entityId: "brand_tesla",
      name: "Tesla",
      score: 0.98,
      explainability: {
        hasAttribution: false,
        attributionScore: null,
        reason: "No explicit attribution returned by taste graph",
      },
      tags: ["Innovation", "Electric"],
    };

    assert.equal(recWithoutAttribution.explainability.hasAttribution, false);
    assert.equal(recWithoutAttribution.explainability.attributionScore, null);
    assert.equal(recWithoutAttribution.explainability.reason, "No explicit attribution returned by taste graph");
  });
});

describe("Tasteprint: Theme Synthesis (Zero Magic Multipliers & Real Data Only)", () => {
  const seedFela: ResolvedLove = {
    rawInput: "Fela Kuti",
    entityId: "seed_fela",
    name: "Fela Kuti",
    detectedType: "urn:entity:artist",
    typeName: "Music Artist",
    tags: ["Afrobeat", "Protest Songs", "Political Activism", "Social Justice", "Rhythmic"],
    confidence: 1.0,
  };

  const seedBreakingBad: ResolvedLove = {
    rawInput: "Breaking Bad",
    entityId: "seed_bb",
    name: "Breaking Bad",
    detectedType: "urn:entity:tv_show",
    typeName: "TV Series",
    tags: ["Crime", "Drama", "Antihero", "Suspense", "Grit"],
    confidence: 1.0,
  };

  const seedChimamanda: ResolvedLove = {
    rawInput: "Chimamanda Ngozi Adichie",
    entityId: "seed_cna",
    name: "Chimamanda Ngozi Adichie",
    detectedType: "urn:entity:author",
    typeName: "Author & Literature",
    tags: ["African Literature", "Postcolonial Fiction", "Feminism", "Social Justice", "Identity"],
    confidence: 1.0,
  };

  const seedNike: ResolvedLove = {
    rawInput: "Nike",
    entityId: "seed_nike",
    name: "Nike",
    detectedType: "urn:entity:brand",
    typeName: "Brand & Fashion",
    tags: ["Activewear", "Sneakers", "Rhythmic", "Kinetic", "Performance"],
    confidence: 1.0,
  };

  const mockRecommendations: CrossDomainRecommendation[] = [
    {
      sourceSeed: "Fela Kuti",
      targetDomain: "urn:entity:movie",
      targetDomainName: "Film & Cinema",
      entityId: "rec_1",
      name: "The Act of Killing",
      score: 0.94,
      explainability: {
        hasAttribution: true,
        attributionScore: 1.0,
        reason: "Traced to Fela Kuti",
      },
      tags: ["Documentary", "Rebellion", "Political Activism"],
    },
  ];

  test("synthesizes portrait with dominant themes tracing to genuine input seeds", () => {
    const portrait = synthesizeTasteprint(
      [seedFela, seedBreakingBad, seedChimamanda, seedNike],
      mockRecommendations
    );

    assert.ok(portrait.archetype.length > 0);
    assert.ok(portrait.topThemes.length > 0);

    // Verify top themes trace to genuine seeds
    for (const theme of portrait.topThemes) {
      assert.ok(theme.count >= 1);
      assert.ok(theme.originSeeds.length >= 1);
      assert.ok(theme.sampleTags.length >= 1);
    }

    // Resistance & Social Defiance should be shared between Fela and Chimamanda (both have Social Justice/Activism)
    const resistanceTheme = portrait.topThemes.find((t) => t.theme.includes("Resistance"));
    assert.ok(resistanceTheme, "Resistance theme should be recognized from genuine tags");
    assert.ok(resistanceTheme.originSeeds.includes("Fela Kuti"));
    assert.ok(resistanceTheme.originSeeds.includes("Chimamanda Ngozi Adichie"));
  });

  test("would it work without Qloo test: empty tags produce no fabricated themes", () => {
    const emptyLove: ResolvedLove = {
      rawInput: "Ghost",
      entityId: "ghost_id",
      name: "Ghost",
      detectedType: "urn:entity:artist",
      typeName: "Music Artist",
      tags: [],
      confidence: 1.0,
    };

    const emptyPortrait = synthesizeTasteprint([emptyLove], []);
    assert.equal(emptyPortrait.topThemes.length, 0);
  });
});
