import { describe, it, expect, vi, beforeEach } from "vitest";

// credits.ts imports the prisma singleton + Stack auth at module load; stub both
// so this unit test needs no database or session. We only exercise the tx-scoped
// charge helpers, passing a fake transaction client.
vi.mock("@/lib/db", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("@/lib/stack", () => ({ stackServerApp: { getUser: vi.fn() } }));

import { applyGenerationCharge, applyContinuationCharge } from "./credits";
import { isAppError, ErrorCode } from "@/lib/errors";

type Tx = {
  userCredits: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  generation: { update: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

function makeTx(balance: number, freeShortsUsed = 0): Tx {
  return {
    userCredits: {
      findUnique: vi.fn().mockResolvedValue({ balance }),
      update: vi.fn().mockImplementation(({ data }: { data: { balance: { decrement: number } } }) =>
        Promise.resolve({ balance: balance - data.balance.decrement }),
      ),
    },
    generation: {
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(freeShortsUsed),
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("applyGenerationCharge", () => {
  it("deducts the flat cost for a paid length and never goes negative", async () => {
    const tx = makeTx(5);
    // medium costs 3; balance 5 -> 2.
    const res = await applyGenerationCharge(tx as never, "gen_1", "user_1", "medium");
    expect(res.creditsCharged).toBe(3);
    expect(res.newBalance).toBe(2);
    expect(tx.userCredits.update).toHaveBeenCalledOnce();
    expect(tx.generation.update).toHaveBeenCalledWith({ where: { id: "gen_1" }, data: { creditsCharged: 3 } });
  });

  it("throws INSUFFICIENT_CREDITS instead of going negative", async () => {
    const tx = makeTx(2); // can't cover a medium (3)
    await expect(applyGenerationCharge(tx as never, "gen_1", "user_1", "medium")).rejects.toSatisfy(
      (e: unknown) => isAppError(e) && e.code === ErrorCode.INSUFFICIENT_CREDITS,
    );
    expect(tx.userCredits.update).not.toHaveBeenCalled();
    expect(tx.generation.update).not.toHaveBeenCalled();
  });

  it("charges 0 for a short within the free daily allowance", async () => {
    const tx = makeTx(0, 0); // 0 free shorts used today -> free
    const res = await applyGenerationCharge(tx as never, "gen_1", "user_1", "short");
    expect(res.creditsCharged).toBe(0);
    expect(tx.userCredits.update).not.toHaveBeenCalled();
    expect(tx.generation.update).toHaveBeenCalledWith({ where: { id: "gen_1" }, data: { creditsCharged: 0 } });
  });
});

describe("applyContinuationCharge", () => {
  it("bills per 1k words and deducts when covered", async () => {
    const tx = makeTx(10);
    const res = await applyContinuationCharge(tx as never, "gen_2", "user_1", 2500); // ceil(2500/1000)=3
    expect(res.creditsCharged).toBe(3);
    expect(res.newBalance).toBe(7);
  });

  it("throws INSUFFICIENT_CREDITS when the balance can't cover it", async () => {
    const tx = makeTx(1);
    await expect(applyContinuationCharge(tx as never, "gen_2", "user_1", 5000)).rejects.toSatisfy(
      (e: unknown) => isAppError(e) && e.code === ErrorCode.INSUFFICIENT_CREDITS,
    );
    expect(tx.userCredits.update).not.toHaveBeenCalled();
  });
});
