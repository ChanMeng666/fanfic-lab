import { describe, it, expect } from "vitest";
import { CREDIT_COSTS, FREE_DAILY_LIMIT, creditsForWords, WORDS_PER_CREDIT } from "./pricing";

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
