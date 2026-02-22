"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import type { StoryRequest, WritingPlan, StoryDeliverable } from "@/lib/types/agent-state";

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
 * Create a new generation record
 */
export async function createGeneration(
  request: StoryRequest,
  type: "STORY" | "CONTINUATION" = "STORY"
): Promise<string> {
  const userId = await getCurrentUserId();

  const generation = await prisma.generation.create({
    data: {
      userId,
      type,
      status: "GENERATING",
      request: request as unknown as Record<string, unknown>,
    },
  });

  return generation.id;
}

/**
 * Update generation with plan
 */
export async function updateGenerationPlan(
  generationId: string,
  plan: WritingPlan
): Promise<void> {
  await prisma.generation.update({
    where: { id: generationId },
    data: { plan: plan as unknown as Record<string, unknown> },
  });
}

/**
 * Complete a generation with the deliverable
 */
export async function completeGeneration(
  generationId: string,
  deliverable: StoryDeliverable
): Promise<void> {
  await prisma.generation.update({
    where: { id: generationId },
    data: {
      status: "COMPLETE",
      deliverable: deliverable as unknown as Record<string, unknown>,
      wordCount: deliverable.metadata.wordCount,
      durationMs: deliverable.metadata.generationTimeMs,
      completedAt: new Date(),
    },
  });
}

/**
 * Mark a generation as failed
 */
export async function failGeneration(
  generationId: string
): Promise<void> {
  await prisma.generation.update({
    where: { id: generationId },
    data: { status: "FAILED" },
  });
}

/**
 * Get generation history for the current user
 */
export async function getGenerationHistory(
  page: number = 1,
  limit: number = 20
): Promise<{
  generations: Array<{
    id: string;
    type: string;
    status: string;
    request: StoryRequest;
    deliverable: StoryDeliverable | null;
    wordCount: number;
    creditsCharged: number;
    createdAt: Date;
    completedAt: Date | null;
  }>;
  total: number;
  hasMore: boolean;
}> {
  const userId = await getCurrentUserId();
  const skip = (page - 1) * limit;

  const [generations, total] = await Promise.all([
    prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.generation.count({ where: { userId } }),
  ]);

  return {
    generations: generations.map((g) => ({
      id: g.id,
      type: g.type,
      status: g.status,
      request: g.request as unknown as StoryRequest,
      deliverable: g.deliverable as unknown as StoryDeliverable | null,
      wordCount: g.wordCount,
      creditsCharged: g.creditsCharged,
      createdAt: g.createdAt,
      completedAt: g.completedAt,
    })),
    total,
    hasMore: skip + limit < total,
  };
}

/**
 * Get a single generation by ID
 */
export async function getGeneration(
  generationId: string
): Promise<{
  id: string;
  type: string;
  status: string;
  request: StoryRequest;
  plan: WritingPlan | null;
  deliverable: StoryDeliverable | null;
  wordCount: number;
  creditsCharged: number;
  createdAt: Date;
  completedAt: Date | null;
} | null> {
  const userId = await getCurrentUserId();

  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId },
  });

  if (!generation) return null;

  return {
    id: generation.id,
    type: generation.type,
    status: generation.status,
    request: generation.request as unknown as StoryRequest,
    plan: generation.plan as unknown as WritingPlan | null,
    deliverable: generation.deliverable as unknown as StoryDeliverable | null,
    wordCount: generation.wordCount,
    creditsCharged: generation.creditsCharged,
    createdAt: generation.createdAt,
    completedAt: generation.completedAt,
  };
}
