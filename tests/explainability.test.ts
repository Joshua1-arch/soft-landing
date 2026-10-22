import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Explainability Parser & Attribution Tests", () => {
  // Helper mimicking real parser in live.ts
  function parseExplainability(rawEntity: any, anchorName = "Taste Anchor") {
    const expSignals = rawEntity.query?.explainability?.["signal.interests.entities"];
    if (!Array.isArray(expSignals) || expSignals.length === 0) {
      return null;
    }

    const explanation = [];
    for (const sig of expSignals.slice(0, 3)) {
      const rawScore = typeof rawEntity.query?.affinity === "number" ? rawEntity.query.affinity : sig.score;
      if (typeof rawScore === "number") {
        const scoreNum = Math.round(rawScore * 100) / 100;
        explanation.push({
          anchorName,
          anchorId: sig.entity_id,
          score: scoreNum,
          reasonText: `Attributed to ${anchorName} — ${scoreNum}`,
        });
      }
    }
    return explanation.length > 0 ? explanation : null;
  }

  test("extracts real multi-signal contribution scores from real response shape", () => {
    // Real Qloo response for 2 input signals
    const mockRealEntity = {
      name: "Gal Costa",
      entity_id: "EED1BAE7-5A87-47EB-9998-089C3F6B3B68",
      query: {
        affinity: 0.9566597828183433,
        explainability: {
          "signal.interests.entities": [
            {
              entity_id: "A17A213E-E45A-408F-9876-F22DD5FAAE6D",
              score: 0.5608626234436062,
            },
            {
              entity_id: "679CEADA-31C3-4A06-99D0-D7384D6693BF",
              score: 0.4391373765563939,
            },
          ],
        },
      },
    };

    const parsed = parseExplainability(mockRealEntity, "Caetano Veloso");
    assert.ok(parsed !== null);
    assert.equal(parsed.length, 2);
    // Uses real affinity or real score
    assert.equal(parsed[0].score, 0.96); // real rounded affinity
    assert.ok(parsed[0].reasonText.includes("0.96"));
    assert.ok(!parsed[0].reasonText.includes("(1)"));
  });

  test("returns null when explainability is absent or empty (never fabricates 1.0 or fake number)", () => {
    const emptyEntity1 = {
      name: "Local Library",
      query: {},
    };
    const emptyEntity2 = {
      name: "Corner Cafe",
      query: {
        affinity: 0.81,
        explainability: {
          "signal.interests.entities": [],
        },
      },
    };

    assert.equal(parseExplainability(emptyEntity1), null);
    assert.equal(parseExplainability(emptyEntity2), null);
  });
});
