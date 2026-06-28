"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  CREDIT_COSTS,
  FREE_DAILY_LIMIT,
  creditsForWords,
  type StoryLength,
} from "@/lib/billing/pricing";

// A Prisma client OR an interactive-transaction client, so the charge helpers can
// run standalone or be composed into a caller's larger $transaction (e.g. the
// atomic story-save in /api/stories).
type Db = typeof prisma | Prisma.TransactionClient;

// ---------------------------------------------------------------------------
// Pricing model ("sell the result, not the tool")
// ---------------------------------------------------------------------------
// The main generator charges a QUOTED FLAT cost per length (see CREDIT_COSTS),
// so the price the user saw before generating is exactly what they pay. Short
// stories are free up to FREE_DAILY_LIMIT per day. Continuations charge
// word-based (creditsForWords) since their length isn't pre-chosen.

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to get current user's DB record id from the session.
async function getCurrentUserId(): Promise<string> {
  const user = await stackServerApp.getUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: user.id },
    select: { id: true },
  });
  if (!dbUser) throw new Error("User not found");
  return dbUser.id;
}

/**
 * Count free short stories the user has consumed today. A "free short" is a
 * SAVED (storyId set) STORY generation created today, of length "short", that
 * was not charged (creditsCharged === 0). We count only saved generations so the
 * daily allowance is spent when a story is kept — generating-and-discarding a
 * short does not burn the allowance. `excludeGenerationId` lets the charge step
 * ignore the row it is about to charge. Accepts a tx client so it stays
 * consistent inside the atomic save transaction.
 */
async function freeShortsUsedToday(
  db: Db,
  userId: string,
  excludeGenerationId?: string
): Promise<number> {
  return db.generation.count({
    where: {
      userId,
      type: "STORY",
      creditsCharged: 0,
      storyId: { not: null },
      createdAt: { gte: startOfToday() },
      request: { path: ["length"], equals: "short" },
      ...(excludeGenerationId ? { id: { not: excludeGenerationId } } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Get the current user's credit balance. */
export async function getBalance(): Promise<{
  balance: number;
  totalUsed: number;
}> {
  const userId = await getCurrentUserId();
  const credits = await prisma.userCredits.findUnique({ where: { userId } });
  return {
    balance: credits?.balance ?? 0,
    totalUsed: credits?.totalUsed ?? 0,
  };
}

/** Today's usage summary for the dashboard / create page. */
export async function getDailyUsage(): Promise<{
  freeUsed: number;
  freeRemaining: number;
  freeLimit: number;
}> {
  const userId = await getCurrentUserId();
  const freeUsed = await freeShortsUsedToday(prisma, userId);
  return {
    freeUsed,
    freeRemaining: Math.max(0, FREE_DAILY_LIMIT - freeUsed),
    freeLimit: FREE_DAILY_LIMIT,
  };
}

export interface GateResult {
  canGenerate: boolean;
  /** Credits this run will cost (0 when covered by the free tier). */
  cost: number;
  /** Whether this run is covered by the daily free-short allowance. */
  isFree: boolean;
  currentBalance: number;
  reason?: string;
}

/**
 * Pre-generation gate. Decides whether the user may start a story of the given
 * length, and what it will cost. Short stories are free up to FREE_DAILY_LIMIT
 * per day; beyond that (and for medium/long) the user must have enough credits.
 */
export async function checkCanGenerate(length: StoryLength): Promise<GateResult> {
  const userId = await getCurrentUserId();
  const credits = await prisma.userCredits.findUnique({ where: { userId } });
  const balance = credits?.balance ?? 0;
  const flatCost = CREDIT_COSTS[length];

  // Free short allowance.
  if (length === "short") {
    const used = await freeShortsUsedToday(prisma, userId);
    if (used < FREE_DAILY_LIMIT) {
      return { canGenerate: true, cost: 0, isFree: true, currentBalance: balance };
    }
  }

  if (balance >= flatCost) {
    return { canGenerate: true, cost: flatCost, isFree: false, currentBalance: balance };
  }

  return {
    canGenerate: false,
    cost: flatCost,
    isFree: false,
    currentBalance: balance,
    reason: `Not enough credits. Need ${flatCost}, have ${balance}.`,
  };
}

// ---------------------------------------------------------------------------
// Charges
// ---------------------------------------------------------------------------

/**
 * Deduct `cost` credits from a user inside the given (transaction) client,
 * enforcing a NON-NEGATIVE balance. Throws INSUFFICIENT_CREDITS rather than
 * letting the balance go below zero. Returns the post-charge balance. A cost of
 * 0 is a no-op read.
 */
async function deductOrThrow(db: Db, userId: string, cost: number): Promise<number> {
  const credits = await db.userCredits.findUnique({ where: { userId } });
  const balance = credits?.balance ?? 0;
  if (cost <= 0) return balance;
  if (balance < cost) {
    throw new AppError(
      ErrorCode.INSUFFICIENT_CREDITS,
      `Not enough credits. Need ${cost}, have ${balance}.`
    );
  }
  const updated = await db.userCredits.update({
    where: { userId },
    data: { balance: { decrement: cost }, totalUsed: { increment: cost } },
  });
  return updated.balance;
}

/**
 * Charge a completed STORY generation at the QUOTED FLAT cost for its length,
 * WITHIN the caller's transaction. Short stories inside the daily free allowance
 * cost 0. Marks the Generation ledger row. Throws INSUFFICIENT_CREDITS (and rolls
 * back the caller's transaction) if a non-free charge can't be covered — so a
 * paid story is never published unpaid and balances never go negative.
 */
export async function applyGenerationCharge(
  tx: Prisma.TransactionClient,
  generationId: string,
  userId: string,
  length: StoryLength
): Promise<{ creditsCharged: number; newBalance: number }> {
  let cost: number = CREDIT_COSTS[length];
  if (length === "short") {
    const used = await freeShortsUsedToday(tx, userId, generationId);
    if (used < FREE_DAILY_LIMIT) cost = 0;
  }
  const newBalance = await deductOrThrow(tx, userId, cost);
  await tx.generation.update({
    where: { id: generationId },
    data: { creditsCharged: cost },
  });
  return { creditsCharged: cost, newBalance };
}

/**
 * Standalone wrapper around applyGenerationCharge for callers that aren't already
 * in a transaction. The deduction + ledger update commit atomically.
 */
export async function chargeGeneration(
  generationId: string,
  userId: string,
  length: StoryLength
): Promise<{ creditsCharged: number; newBalance: number }> {
  return prisma.$transaction((tx) => applyGenerationCharge(tx, generationId, userId, length));
}

/**
 * Charge a continuation, billed per 1,000 delivered words (min 1), WITHIN the
 * caller's transaction. Used by the continue/branch/poll-settle paths where the
 * length isn't pre-chosen. Non-negative + atomic, like applyGenerationCharge.
 */
export async function applyContinuationCharge(
  tx: Prisma.TransactionClient,
  generationId: string,
  userId: string,
  deliveredWords: number
): Promise<{ creditsCharged: number; newBalance: number }> {
  const cost = creditsForWords(deliveredWords);
  const newBalance = await deductOrThrow(tx, userId, cost);
  await tx.generation.update({
    where: { id: generationId },
    data: { creditsCharged: cost },
  });
  return { creditsCharged: cost, newBalance };
}

/** Standalone wrapper around applyContinuationCharge (atomic deduction + ledger). */
export async function chargeContinuation(
  generationId: string,
  userId: string,
  deliveredWords: number
): Promise<{ creditsCharged: number; newBalance: number }> {
  return prisma.$transaction((tx) => applyContinuationCharge(tx, generationId, userId, deliveredWords));
}

// ---------------------------------------------------------------------------
// Top-ups
// ---------------------------------------------------------------------------

/**
 * Grant credits to a specific user. Called by the Stripe webhook (no session),
 * so the userId is explicit. This is the ONLY money-in path to a balance.
 */
export async function addCreditsToUser(
  userId: string,
  amount: number
): Promise<{ newBalance: number }> {
  const credits = await prisma.userCredits.upsert({
    where: { userId },
    create: { userId, balance: amount, totalUsed: 0 },
    update: { balance: { increment: amount } },
  });
  return { newBalance: credits.balance };
}

/** Session-scoped top-up (admin/manual). Delegates to addCreditsToUser. */
export async function addCredits(amount: number): Promise<{ newBalance: number }> {
  const userId = await getCurrentUserId();
  return addCreditsToUser(userId, amount);
}
