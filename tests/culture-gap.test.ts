import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { LiveQlooAdapter } from "../lib/qloo/live.ts";

describe("Culture-Gap Formula Tests (Zero Magic Multipliers & Independent Compare)", () => {
  test("given a fixture compare response with 3 specific tags, assert overlap == 0.6 (not 0.6 × anything)", () => {
    const threeSpecificTags = [
      { name: "Afrobeat", subtype: "urn:tag:genre:music" },
      { name: "Jazz", subtype: "urn:tag:genre:music" },
      { name: "Funk", subtype: "urn:tag:genre:music" },
    ];

    const result = LiveQlooAdapter.computeOverlapFromTags(threeSpecificTags);
    assert.equal(result.overlap, 0.6, "3 specific tags / 5 must equal exactly 0.60");
    assert.equal(result.hasData, true, "hasData must be true when tags exist");
  });

  test("given an empty tags array, assert overlap == 0.0 and the 'not enough data' flag", () => {
    const emptyResult = LiveQlooAdapter.computeOverlapFromTags([]);
    assert.equal(emptyResult.overlap, 0.0);
    assert.equal(emptyResult.hasData, false);

    const nullResult = LiveQlooAdapter.computeOverlapFromTags(null as any);
    assert.equal(nullResult.overlap, 0.0);
    assert.equal(nullResult.hasData, false);
  });

  test("evaluates specific tags (1.0) and generic catch-alls (0.25) deterministically", () => {
    const specific5 = [
      { name: "Drums", subtype: "urn:tag:instrument:music" },
      { name: "Folk", subtype: "urn:tag:genre:music" },
      { name: "Jazz", subtype: "urn:tag:genre:music" },
      { name: "Blues", subtype: "urn:tag:genre:music" },
      { name: "Ragtime", subtype: "urn:tag:genre:music" },
    ];
    const res5 = LiveQlooAdapter.computeOverlapFromTags(specific5);
    assert.equal(res5.overlap, 1.0);
    assert.equal(res5.hasData, true);

    const generic2 = [
      { name: "Place", subtype: "urn:tag:genre:place" },
      { name: "Tourist Attraction", subtype: "urn:tag:genre:place" },
    ];
    const resGen = LiveQlooAdapter.computeOverlapFromTags(generic2);
    assert.equal(resGen.overlap, 0.1); // (0.25 + 0.25) / 5 = 0.10
    assert.equal(resGen.hasData, true);
  });

  test("asserts there is NO code path that multiplies one category's result by a constant to produce another", () => {
    const liveTsPath = path.resolve(process.cwd(), "lib/qloo/live.ts");
    const liveTsContent = fs.readFileSync(liveTsPath, "utf-8");

    // Locate computeCultureGap method body
    const computeGapBody = liveTsContent.slice(liveTsContent.indexOf("computeCultureGap("));

    // Must not contain cross-domain scaling or magic multipliers
    assert.ok(!computeGapBody.includes("* 0.7"), "Must not multiply by 0.70");
    assert.ok(!computeGapBody.includes("* 0.8"), "Must not multiply by 0.80");
    assert.ok(!computeGapBody.includes("* 1.5"), "Must not multiply by 1.50");
    assert.ok(!computeGapBody.includes("* 0.65"), "Must not multiply by 0.65");
    assert.ok(!computeGapBody.includes("musicOverlap *"), "Film must not be scaled from Music");
    assert.ok(!computeGapBody.includes("placesOverlap *"), "Food must not be scaled from Places");
  });
});
