"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import {
  CREDIT_COSTS,
  FREE_DAILY_LIMIT,
  creditsForWords,
  type StoryLength,
} from "@/lib/billing/pricing";

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
 * STORY generation created today, of length "short", that has not been charged
 * (creditsCharged === 0). `excludeGenerationId` lets the charge step ignore the
 * row it is about to charge.
 */
async function freeShortsUsedToday(
  userId: string,
  excludeGenerationId?: string
): Promise<number> {
  return prisma.generation.count({
    where: {
      userId,
      type: "STORY",
      creditsCharged: 0,
      createdAt: { gte: startOfToday() },
      request: { path: ["length"], equals: "short" },
      ...(excludeGenerationId ? { id: { not: excludeGenerationId } } : {}),
      status: { in: ["COMPLETE", "GENERATING"] },
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
  const freeUsed = await freeShortsUsedToday(userId);
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
    const used = await freeShortsUsedToday(userId);
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
 * Charge for a completed STORY generation at the QUOTED FLAT cost for its
 * length. Short stories within the daily free allowance cost 0. Records the
 * charge on the Generation ledger. Call once per generation, right after the
 * row is created.
 */
export async function chargeGeneration(
  generationId: string,
  userId: string,
  length: StoryLength
): Promise<{ creditsCharged: number; newBalance: number }> {
  let cost: number = CREDIT_COSTS[length];

  if (length === "short") {
    const used = await freeShortsUsedToday(userId, generationId);
    if (used < FREE_DAILY_LIMIT) cost = 0;
  }

  if (cost > 0) {
    await prisma.userCredits.upsert({
      where: { userId },
      create: { userId, balance: -cost, totalUsed: cost },
      update: { balance: { decrement: cost }, totalUsed: { increment: cost } },
    });
  }

  await prisma.generation.update({
    where: { id: generationId },
    data: { creditsCharged: cost },
  });

  const credits = await prisma.userCredits.findUnique({ where: { userId } });
  return { creditsCharged: cost, newBalance: credits?.balance ?? 0 };
}

/**
 * Charge for a continuation, billed per 1,000 delivered words (min 1). Used by
 * the continue route where the length isn't pre-chosen.
 */
export async function chargeContinuation(
  generationId: string,
  userId: string,
  deliveredWords: number
): Promise<{ creditsCharged: number; newBalance: number }> {
  const cost = creditsForWords(deliveredWords);

  const credits = await prisma.userCredits.upsert({
    where: { userId },
    create: { userId, balance: -cost, totalUsed: cost },
    update: { balance: { decrement: cost }, totalUsed: { increment: cost } },
  });

  await prisma.generation.update({
    where: { id: generationId },
    data: { creditsCharged: cost },
  });

  return { creditsCharged: cost, newBalance: credits.balance };
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
