import { describe, it, expect } from "vitest";
import {
  parseBody,
  createBodySchema,
  saveStoryBodySchema,
  continueBodySchema,
  branchBodySchema,
} from "./api";
import { isAppError, ErrorCode } from "@/lib/errors";

function expectValidationError(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    expect(isAppError(e)).toBe(true);
    if (isAppError(e)) expect(e.code).toBe(ErrorCode.VALIDATION);
    return;
  }
  throw new Error("expected a VALIDATION AppError to be thrown");
}

describe("saveStoryBodySchema", () => {
  it("requires a generationId", () => {
    expectValidationError(() => parseBody(saveStoryBodySchema, {}));
    expectValidationError(() => parseBody(saveStoryBodySchema, { generationId: "" }));
  });
  it("accepts a generationId and optional remix source", () => {
    expect(parseBody(saveStoryBodySchema, { generationId: "gen_1" })).toEqual({ generationId: "gen_1" });
    expect(parseBody(saveStoryBodySchema, { generationId: "gen_1", remixedFromId: "s2" })).toMatchObject({
      generationId: "gen_1",
      remixedFromId: "s2",
    });
  });
});

describe("continueBodySchema", () => {
  it("rejects too-short / too-long directions", () => {
    expectValidationError(() => parseBody(continueBodySchema, { direction: "abc" }));
    expectValidationError(() => parseBody(continueBodySchema, { direction: "x".repeat(1001) }));
  });
  it("trims and accepts a valid direction", () => {
    expect(parseBody(continueBodySchema, { direction: "  下一章他们重逢  " })).toEqual({
      direction: "下一章他们重逢",
    });
  });
});

describe("branchBodySchema", () => {
  it("requires a parentChapterId", () => {
    expectValidationError(() => parseBody(branchBodySchema, { direction: "他们重逢了吧" }));
  });
  it("accepts a valid branch body", () => {
    expect(parseBody(branchBodySchema, { parentChapterId: "c1", direction: "他们重逢了吧" })).toEqual({
      parentChapterId: "c1",
      direction: "他们重逢了吧",
    });
  });
});

describe("createBodySchema", () => {
  it("requires either a prompt or a chosen CP", () => {
    expectValidationError(() => parseBody(createBodySchema, {}));
    expectValidationError(() => parseBody(createBodySchema, { prompt: "   " }));
  });
  it("accepts a free-text prompt", () => {
    expect(parseBody(createBodySchema, { prompt: "写一个甜文" }).prompt).toBe("写一个甜文");
  });
  it("accepts structured CP-only input", () => {
    expect(parseBody(createBodySchema, { cp: ["砂金", "星期日"] }).cp).toEqual(["砂金", "星期日"]);
  });
  it("rejects an invalid length", () => {
    expectValidationError(() => parseBody(createBodySchema, { prompt: "x", length: "epic" }));
  });
});
