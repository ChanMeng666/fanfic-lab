"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireDbUser } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/errors";

// Bookmarks (收藏 / 稍后读). Distinct from likes: a bookmark is a private
// save-for-later marker — no notification fan-out, no effect on popularity.

export async function toggleBookmark(storyId: string): Promise<{ bookmarked: boolean }> {
  const user = await requireDbUser();

  const existing = await prisma.bookmark.findUnique({
    where: { userId_storyId: { userId: user.id, storyId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    revalidatePath("/profile");
    return { bookmarked: false };
  }

  // Validate the story exists to avoid orphaned bookmarks from stale UI.
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true },
  });
  if (!story) throw new AppError(ErrorCode.NOT_FOUND, "故事不存在");

  await prisma.bookmark.create({ data: { userId: user.id, storyId } });
  revalidatePath("/profile");
  return { bookmarked: true };
}

/** The current user's bookmarked stories, most-recently-saved first. */
export async function getBookmarkedStories() {
  const user = await requireDbUser();

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      story: {
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true },
          },
          _count: {
            select: { likes: true, comments: true, chapters: true },
          },
        },
      },
    },
  });

  return bookmarks.map((b) => b.story);
}
