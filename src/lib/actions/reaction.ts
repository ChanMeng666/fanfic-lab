"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ReactionType } from "@prisma/client";
import { requireDbUser } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/errors";

// Expressive multi-reactions (催泪/带感/脑洞/甜). One per user per story; setting
// the same type again clears it (toggle), a different type replaces it.

export type ReactionCounts = Record<ReactionType, number>;

export interface ReactionSummary {
  counts: ReactionCounts;
  myReaction: ReactionType | null;
  total: number;
}

const EMPTY_COUNTS: ReactionCounts = { TEARS: 0, FIRE: 0, MIND_BLOWN: 0, SWEET: 0 };

export async function getReactionSummary(
  storyId: string,
  currentUserId?: string | null
): Promise<ReactionSummary> {
  const [grouped, mine] = await Promise.all([
    prisma.reaction.groupBy({
      by: ["type"],
      where: { storyId },
      _count: { type: true },
    }),
    currentUserId
      ? prisma.reaction.findUnique({
          where: { userId_storyId: { userId: currentUserId, storyId } },
          select: { type: true },
        })
      : Promise.resolve(null),
  ]);

  const counts: ReactionCounts = { ...EMPTY_COUNTS };
  let total = 0;
  for (const g of grouped) {
    counts[g.type] = g._count.type;
    total += g._count.type;
  }

  return { counts, myReaction: mine?.type ?? null, total };
}

export async function setReaction(
  storyId: string,
  type: ReactionType
): Promise<{ myReaction: ReactionType | null }> {
  const user = await requireDbUser();

  const existing = await prisma.reaction.findUnique({
    where: { userId_storyId: { userId: user.id, storyId } },
    select: { id: true, type: true },
  });

  if (existing) {
    if (existing.type === type) {
      // Toggle off.
      await prisma.reaction.delete({ where: { id: existing.id } });
      revalidatePath(`/story/${storyId}`);
      return { myReaction: null };
    }
    await prisma.reaction.update({ where: { id: existing.id }, data: { type } });
    revalidatePath(`/story/${storyId}`);
    return { myReaction: type };
  }

  // Validate the story exists before creating.
  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { id: true } });
  if (!story) throw new AppError(ErrorCode.NOT_FOUND, "故事不存在");

  await prisma.reaction.create({ data: { userId: user.id, storyId, type } });
  revalidatePath(`/story/${storyId}`);
  return { myReaction: type };
}
