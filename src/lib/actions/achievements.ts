"use server";

import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/actions/notification";
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from "@/lib/achievements";

// Achievement awarding + creation-streak tracking. All entry points are
// best-effort: callers wrap them so a failure never blocks the user action that
// triggered them.

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/**
 * Idempotently grant an achievement. The unique [userId, key] constraint makes
 * the create throw on a duplicate, so we only notify on the FIRST grant.
 */
async function grant(userId: string, key: string): Promise<void> {
  const def = ACHIEVEMENT_MAP[key];
  if (!def) return;
  try {
    await prisma.userAchievement.create({ data: { userId, key } });
  } catch {
    return; // already earned — no re-notify
  }
  await createNotification({
    recipientId: userId,
    type: "achievement_unlocked",
    payload: {
      // No human actor — use a sentinel so the self-notify guard doesn't drop it.
      actorId: "system",
      actorName: "FanFic Lab",
      actorUsername: "fanfic-lab",
      achievementTitle: def.title,
    },
  });
}

/** Update the creation streak (day granularity) and grant streak milestones. */
async function updateCreationStreak(userId: string): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastCreationAt: true, creationStreak: true, longestStreak: true },
  });
  const now = new Date();
  let streak: number;
  if (u?.lastCreationAt) {
    const diffDays = Math.round((startOfDay(now) - startOfDay(u.lastCreationAt)) / 86_400_000);
    if (diffDays === 0) streak = u.creationStreak || 1; // same day — keep
    else if (diffDays === 1) streak = (u.creationStreak || 0) + 1; // consecutive day
    else streak = 1; // gap — reset
  } else {
    streak = 1;
  }
  const longest = Math.max(u?.longestStreak ?? 0, streak);
  await prisma.user.update({
    where: { id: userId },
    data: { creationStreak: streak, longestStreak: longest, lastCreationAt: now },
  });
  if (streak >= 7) await grant(userId, "streak_7");
}

/** Called after a user saves a generated story. */
export async function onStorySaved(userId: string): Promise<void> {
  try {
    await updateCreationStreak(userId);
    const count = await prisma.story.count({
      where: { authorId: userId, status: "PUBLISHED" },
    });
    if (count >= 1) await grant(userId, "first_story");
    if (count >= 5) await grant(userId, "prolific_5");
  } catch {
    // best-effort
  }
}

/** Called after a like is added to one of the author's stories. */
export async function onLikeAdded(authorId: string): Promise<void> {
  try {
    const likes = await prisma.like.count({ where: { story: { authorId } } });
    if (likes >= 100) await grant(authorId, "liked_100");
  } catch {
    // best-effort
  }
}

/** Called when a reader's branch is canonized — rewards the proposer. */
export async function onBranchAdopted(proposerId: string): Promise<void> {
  try {
    await grant(proposerId, "branch_adopted");
  } catch {
    // best-effort
  }
}

export interface AchievementView {
  key: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: Date | null;
}

/** Full catalog with earned flags for a user, for the profile display. */
export async function getUserAchievements(userId: string): Promise<AchievementView[]> {
  const earned = await prisma.userAchievement.findMany({
    where: { userId },
    select: { key: true, createdAt: true },
  });
  const earnedMap = new Map(earned.map((e) => [e.key, e.createdAt]));
  return ACHIEVEMENTS.map((a) => ({
    key: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    earned: earnedMap.has(a.key),
    earnedAt: earnedMap.get(a.key) ?? null,
  }));
}
