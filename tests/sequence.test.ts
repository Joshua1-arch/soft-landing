import { describe, it } from "node:test";
import assert from "node:assert";
import { computeTargetNovelty, computeFullCurve } from "../lib/ramp.ts";
import { sequencePlan, DOMAIN_QUOTAS } from "../lib/sequence.ts";
import { MockQlooAdapter } from "../lib/qloo/mock.ts";
import { PERSONAS } from "../lib/qloo/fixtures/personas.ts";
import type { UserPreferences } from "../lib/qloo/types.ts";

describe("Familiarity Ramp Engine (lib/ramp.ts)", () => {
  it("satisfies the three exact endpoint cases from the specification", () => {
    // Case 1: Standard curve (A = 50)
    assert.strictEqual(computeTargetNovelty(1, 50), 0.2);
    assert.strictEqual(computeTargetNovelty(12, 50), 0.575);

    // Case 2: Maximum comfort (A = 0)
    assert.strictEqual(computeTargetNovelty(1, 0), 0.15);
    assert.strictEqual(computeTargetNovelty(12, 0), 0.45);

    // Case 3: Deep end (A = 100)
    assert.strictEqual(computeTargetNovelty(1, 100), 0.25);
    assert.strictEqual(computeTargetNovelty(12, 100), 0.7);
  });

  it("is strictly monotonic across all 12 weeks", () => {
    for (const adventure of [0, 25, 50, 75, 100]) {
      const curve = computeFullCurve(adventure);
      assert.strictEqual(curve.length, 12);
      for (let i = 0; i < curve.length - 1; i++) {
        assert.ok(
          curve[i + 1] >= curve[i],
          `Curve at A=${adventure} failed monotonicity at week ${i + 1}: ${curve[i]} > ${curve[i + 1]}`
        );
      }
    }
  });

  it("clamps all target values strictly to [0, 1]", () => {
    for (let w = 1; w <= 12; w++) {
      const n0 = computeTargetNovelty(w, 0);
      const n100 = computeTargetNovelty(w, 100);
      assert.ok(n0 >= 0 && n0 <= 1);
      assert.ok(n100 >= 0 && n100 <= 1);
    }
  });
});

describe("Sequencing Engine (lib/sequence.ts)", async () => {
  const adapter = new MockQlooAdapter();
  const amaraCandidates = await adapter.getFullCandidatePool("amara");

  it("produces a 12-week plan with exactly 3 items per week and zero duplicate items", () => {
    const user: UserPreferences = {
      originCity: "Lagos",
      destinationCity: "Manchester",
      anchors: PERSONAS.amara.anchors,
      resolvedAnchorIds: ["id_1"],
      constraints: ["low budget", "halal"],
      adventure: 65,
      lovedTags: [],
      avoidTags: [],
      penalizedDomains: { music: 0, food: 0, film: 0, books: 0, podcasts: 0, places: 0 },
    };

    const plan = sequencePlan({
      user,
      candidatePool: amaraCandidates,
    });

    assert.strictEqual(plan.length, 12, "Must produce 12 weeks");

    const seenIds = new Set<string>();
    for (const week of plan) {
      assert.strictEqual(week.items.length, 3, `Week ${week.weekNumber} must have exactly 3 items`);
      for (const item of week.items) {
        assert.ok(!seenIds.has(item.id), `Duplicate item detected: ${item.id} in week ${week.weekNumber}`);
        seenIds.add(item.id);
      }
    }
  });

  it("is completely deterministic given identical state", () => {
    const user: UserPreferences = {
      originCity: "Lagos",
      destinationCity: "Manchester",
      anchors: PERSONAS.amara.anchors,
      resolvedAnchorIds: ["id_1"],
      constraints: ["low budget"],
      adventure: 50,
      lovedTags: [],
      avoidTags: [],
      penalizedDomains: { music: 0, food: 0, film: 0, books: 0, podcasts: 0, places: 0 },
    };

    const planA = sequencePlan({ user, candidatePool: amaraCandidates });
    const planB = sequencePlan({ user, candidatePool: amaraCandidates });

    assert.deepStrictEqual(
      planA.map((w) => w.items.map((i) => i.id)),
      planB.map((w) => w.items.map((i) => i.id)),
      "Sequencing output must be identical for identical input"
    );
  });
});
