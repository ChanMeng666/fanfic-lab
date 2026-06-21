"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";

// Pre-generation estimate (words not known yet) used only by the gate/UI.
// The authoritative charge is word-based — see creditsForWords().
const CREDIT_COSTS = {
  short: 1,   // ~1000 words
  medium: 3,  // ~3000 words
  long: 5,    // ~6000 words
  continuation: 1,
} as const;

// Billing unit: pay per 1,000 delivered words ("sell the result, not the tool").
// This is the authoritative charge applied once delivered word count is known.
const WORDS_PER_CREDIT = 1000;

/** Credits owed for a delivered piece, billed per 1k words (min 1). */
export function creditsForWords(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_CREDIT));
}

// Free tier limits
const FREE_DAILY_LIMIT = 3; // 3 short stories per day

// Helper to get current user's DB record
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
 * Get the user's current credit balance
 */
export async function getBalance(): Promise<{
  balance: number;
  totalUsed: number;
}> {
  const userId = await getCurrentUserId();

  const credits = await prisma.userCredits.findUnique({
    where: { userId },
  });

  return {
    balance: credits?.balance ?? 0,
    totalUsed: credits?.totalUsed ?? 0,
  };
}

/**
 * Check if user can generate (has enough credits or free tier remaining)
 */
export async function checkCanGenerate(
  length: "short" | "medium" | "long"
): Promise<{
  canGenerate: boolean;
  reason?: string;
  creditsNeeded: number;
  currentBalance: number;
}> {
  const userId = await getCurrentUserId();
  const creditsNeeded = CREDIT_COSTS[length];

  const credits = await prisma.userCredits.findUnique({
    where: { userId },
  });

  const balance = credits?.balance ?? 0;

  // Check free tier: count today's generations
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = await prisma.generation.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
      status: { in: ["COMPLETE", "GENERATING"] },
    },
  });

  // Free users can generate up to FREE_DAILY_LIMIT short stories
  if (balance <= 0 && todayCount < FREE_DAILY_LIMIT && length === "short") {
    return { canGenerate: true, creditsNeeded: 0, currentBalance: balance };
  }

  if (balance >= creditsNeeded) {
    return { canGenerate: true, creditsNeeded, currentBalance: balance };
  }

  return {
    canGenerate: false,
    reason: `Not enough credits. Need ${creditsNeeded}, have ${balance}.`,
    creditsNeeded,
    currentBalance: balance,
  };
}

/**
 * Charge for a completed generation, billed per 1,000 delivered words.
 *
 * NOTE (groundwork): this is the word-based ("pay for the result") charge function,
 * but it is intentionally NOT wired into the generation flow yet — flipping live
 * deduction on is the deferred business-model pivot. When ready, call this from
 * /api/stories after the Generation row is created, passing result.wordCount.
 */
export async function deductCredits(
  generationId: string,
  deliveredWords: number
): Promise<{ newBalance: number; creditsCharged: number }> {
  const userId = await getCurrentUserId();
  const cost = creditsForWords(deliveredWords);

  const credits = await prisma.userCredits.upsert({
    where: { userId },
    create: { userId, balance: -cost, totalUsed: cost },
    update: {
      balance: { decrement: cost },
      totalUsed: { increment: cost },
    },
  });

  // Record the authoritative per-result charge on the generation ledger.
  await prisma.generation.update({
    where: { id: generationId },
    data: { creditsCharged: cost },
  });

  return { newBalance: credits.balance, creditsCharged: cost };
}

/**
 * Add credits to user's balance
 */
export async function addCredits(
  amount: number
): Promise<{ newBalance: number }> {
  const userId = await getCurrentUserId();

  const credits = await prisma.userCredits.upsert({
    where: { userId },
    create: { userId, balance: amount, totalUsed: 0 },
    update: { balance: { increment: amount } },
  });

  return { newBalance: credits.balance };
}

/**
 * Get today's usage statistics
 */
export async function getDailyUsage(): Promise<{
  generationsToday: number;
  freeRemaining: number;
}> {
  const userId = await getCurrentUserId();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const generationsToday = await prisma.generation.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
      status: { in: ["COMPLETE", "GENERATING"] },
    },
  });

  return {
    generationsToday,
    freeRemaining: Math.max(0, FREE_DAILY_LIMIT - generationsToday),
  };
}
