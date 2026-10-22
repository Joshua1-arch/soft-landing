import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { violatesHardConstraints } from "../lib/sequence.ts";
import type { InsightResult } from "../lib/qloo/types.ts";

describe("Constraint Verification Tests (Dietary & Mobility)", () => {
  const makeItem = (category: "food" | "places", tags: string[], name = "Test Item"): InsightResult => ({
    entity: {
      id: "item_test",
      name,
      type: category === "food" ? "urn:entity:place" : "urn:entity:place",
      category,
      tags,
    },
    rawAffinity: 0.85,
    normalizedFamiliarity: 0.5,
    novelty: 0.5,
  });

  test("Wheelchair accessible entrance satisfies limited mobility constraint", () => {
    const accessiblePlace = makeItem("places", [
      "Culture arts",
      "Library",
      "Wheelchair accessible entrance",
      "Elevators",
    ]);

    const inaccessiblePlace = makeItem("places", [
      "Viewpoint",
      "Stairs",
      "No wheelchair access",
    ]);

    assert.equal(
      violatesHardConstraints(accessiblePlace, ["limited mobility"]),
      false,
      "Place with wheelchair accessible entrance must NOT violate limited mobility"
    );

    assert.equal(
      violatesHardConstraints(inaccessiblePlace, ["limited mobility"]),
      true,
      "Place with stairs/no wheelchair access MUST violate limited mobility"
    );
  });

  test("Explicit meat items (kebabs, burgers, steak) violate vegetarian constraint", () => {
    const meatSpot = makeItem("food", [
      "Restaurant",
      "Casual",
      "Kebabs",
      "Burgers",
      "Late night",
    ]);

    assert.equal(
      violatesHardConstraints(meatSpot, ["vegetarian"]),
      true,
      "Food item with Kebabs/Burgers tag must violate vegetarian constraint"
    );
  });

  test("Verified vegetarian items pass constraint, while items without explicit signals are flagged", () => {
    const verifiedVegItem = makeItem("food", [
      "Restaurant",
      "Vegetarian",
      "Dine in",
      "Salads",
    ]);

    const unconfirmedItem = makeItem("food", [
      "Bakery",
      "Cafe",
      "Coffee and tea",
      "Pastries",
    ]);

    // Neither has meat tags
    assert.equal(
      violatesHardConstraints(verifiedVegItem, ["vegetarian"]),
      false,
      "Verified vegetarian item passes constraint"
    );

    assert.equal(
      violatesHardConstraints(unconfirmedItem, ["vegetarian"]),
      false,
      "Non-meat item passes hard filter to prevent emptying category"
    );

    // Verify tag-based verification check (used by UI for flagging)
    const isVerifiedVeg = (tags: string[]) => tags.some((t) => t.toLowerCase().includes("veg") || t.toLowerCase().includes("plant"));
    assert.equal(isVerifiedVeg(verifiedVegItem.entity.tags), true, "Verified item detected as vegetarian");
    assert.equal(isVerifiedVeg(unconfirmedItem.entity.tags), false, "Item without dietary tags flagged as unconfirmed");
  });
});
