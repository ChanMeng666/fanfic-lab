import { describe, it, expect } from "vitest";
import {
  CREDIT_COSTS,
  FREE_DAILY_LIMIT,
  creditsForWords,
  WORDS_PER_CREDIT,
  LENGTH_SPECS,
  LENGTH_OPTIONS,
} from "./pricing";

describe("pricing", () => {
  it("has a non-decreasing flat cost by length", () => {
    expect(CREDIT_COSTS.short).toBeLessThan(CREDIT_COSTS.medium);
    expect(CREDIT_COSTS.medium).toBeLessThan(CREDIT_COSTS.long);
  });

  it("creditsForWords bills per 1k words, minimum 1", () => {
    expect(creditsForWords(0)).toBe(1);
    expect(creditsForWords(1)).toBe(1);
    expect(creditsForWords(WORDS_PER_CREDIT)).toBe(1);
    expect(creditsForWords(WORDS_PER_CREDIT + 1)).toBe(2);
    expect(creditsForWords(2999)).toBe(3);
    expect(creditsForWords(3000)).toBe(3);
  });

  it("exposes a positive free daily allowance", () => {
    expect(FREE_DAILY_LIMIT).toBeGreaterThan(0);
  });
});

describe("length specs (calibration)", () => {
  it("targetWords and maxScenes increase with the tier", () => {
    expect(LENGTH_SPECS.short.targetWords).toBeLessThan(LENGTH_SPECS.medium.targetWords);
    expect(LENGTH_SPECS.medium.targetWords).toBeLessThan(LENGTH_SPECS.long.targetWords);
    expect(LENGTH_SPECS.short.maxScenes).toBeLessThanOrEqual(LENGTH_SPECS.medium.maxScenes);
    expect(LENGTH_SPECS.medium.maxScenes).toBeLessThanOrEqual(LENGTH_SPECS.long.maxScenes);
  });

  it("UI length labels are derived from the canonical spec (single source of truth)", () => {
    for (const opt of LENGTH_OPTIONS) {
      expect(opt.approxZh).toBe(LENGTH_SPECS[opt.value].approxZh);
    }
  });

  it("a short stays meaningfully shorter than a medium", () => {
    // The bug this guards: short ballooning into medium/long territory.
    expect(LENGTH_SPECS.short.targetWords).toBeLessThanOrEqual(1500);
    expect(LENGTH_SPECS.short.maxScenes).toBeLessThanOrEqual(2);
  });
});
