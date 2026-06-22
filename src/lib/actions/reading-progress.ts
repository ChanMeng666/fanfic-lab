"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";

// Server-side "继续阅读". Records the last chapter a logged-in user opened, so
// the profile can offer a cross-device resume list. Anonymous reads are no-ops.

async function currentDbUserId(): Promise<string | null> {
  try {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) return null;
    const dbUser = await prisma.user.findUnique({
      where: { stackAuthId: stackUser.id },
      select: { id: true },
    });
    return dbUser?.id ?? null;
  } catch {
    return null;
  }
}

/** Fire-and-forget upsert of the user's position in a story. */
export async function recordReadingProgress(storyId: string, chapterNumber: number) {
  const userId = await currentDbUserId();
  if (!userId) return { ok: false };
  const n = Number.isInteger(chapterNumber) && chapterNumber > 0 ? chapterNumber : 1;
  try {
    await prisma.readingProgress.upsert({
      where: { userId_storyId: { userId, storyId } },
      create: { userId, storyId, lastChapterNumber: n },
      update: { lastChapterNumber: n },
    });
  } catch {
    // Non-critical — never surface to the reader.
  }
  return { ok: true };
}

export interface ContinueReadingItem {
  storyId: string;
  title: string;
  lastChapterNumber: number;
  totalChapters: number;
  authorUsername: string;
  updatedAt: Date;
}

/** The current user's recently-read stories, newest first. */
export async function getContinueReading(limit = 6): Promise<ContinueReadingItem[]> {
  const userId = await currentDbUserId();
  if (!userId) return [];

  const rows = await prisma.readingProgress.findMany({
    where: { userId, story: { status: "PUBLISHED" } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      lastChapterNumber: true,
      updatedAt: true,
      storyId: true,
      story: {
        select: {
          title: true,
          author: { select: { username: true } },
          _count: { select: { chapters: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    storyId: r.storyId,
    title: r.story.title,
    lastChapterNumber: r.lastChapterNumber,
    totalChapters: r.story._count.chapters,
    authorUsername: r.story.author.username,
    updatedAt: r.updatedAt,
  }));
}
