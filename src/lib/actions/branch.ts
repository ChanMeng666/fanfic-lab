"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireDbUser } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/errors";
import { createNotification } from "@/lib/actions/notification";

// Server actions for community AI co-creation (互动续写 / 分支续写). Branch
// GENERATION (the paid LLM call) lives in the SSE route
// src/app/api/stories/[id]/branches/route.ts; everything cheap (read tree,
// like, canonize, moderate) lives here as plain server actions.

const PREVIEW_LEN = 300;

export interface BranchTreeItem {
  id: string;
  parentChapterId: string | null;
  direction: string;
  title: string | null;
  wordCount: number;
  preview: string;
  status: "ACTIVE" | "CANONIZED" | "HIDDEN";
  canonizedChapterId: string | null;
  createdAt: Date;
  proposer: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  likeCount: number;
  likedByMe: boolean;
}

/**
 * All visible (non-HIDDEN) branches for a story, flat, ordered by likes desc
 * then recency. The UI groups them by `parentChapterId`. `currentUserId`
 * (optional) drives the per-branch `likedByMe` flag.
 */
export async function getBranchTree(
  storyId: string,
  currentUserId?: string | null
): Promise<BranchTreeItem[]> {
  const branches = await prisma.storyBranch.findMany({
    where: { storyId, status: { not: "HIDDEN" } },
    include: {
      proposer: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { likes: true } },
      likes: currentUserId
        ? { where: { userId: currentUserId }, select: { id: true } }
        : false,
    },
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
  });

  return branches.map((b) => ({
    id: b.id,
    parentChapterId: b.parentChapterId,
    direction: b.direction,
    title: b.title,
    wordCount: b.wordCount,
    preview:
      b.content.length > PREVIEW_LEN ? b.content.slice(0, PREVIEW_LEN) + "…" : b.content,
    status: b.status,
    canonizedChapterId: b.canonizedChapterId,
    createdAt: b.createdAt,
    proposer: b.proposer,
    likeCount: b._count.likes,
    likedByMe: Array.isArray(b.likes) && b.likes.length > 0,
  }));
}

/** Full branch content for the dedicated branch reader page. */
export async function getBranch(branchId: string) {
  const branch = await prisma.storyBranch.findUnique({
    where: { id: branchId },
    include: {
      story: { select: { id: true, title: true, fandom: true, authorId: true } },
      parentChapter: { select: { chapterNumber: true, title: true } },
      proposer: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { likes: true } },
    },
  });
  return branch;
}

export async function toggleBranchLike(
  branchId: string
): Promise<{ liked: boolean; count: number }> {
  const user = await requireDbUser();

  const existing = await prisma.branchLike.findUnique({
    where: { userId_branchId: { userId: user.id, branchId } },
  });

  if (existing) {
    await prisma.branchLike.delete({ where: { id: existing.id } });
    const count = await prisma.branchLike.count({ where: { branchId } });
    revalidatePath("/story");
    return { liked: false, count };
  }

  // Validate the branch exists before creating (avoid orphaned likes).
  const branch = await prisma.storyBranch.findUnique({
    where: { id: branchId },
    select: {
      proposerId: true,
      direction: true,
      storyId: true,
      story: { select: { title: true } },
    },
  });
  if (!branch) throw new AppError(ErrorCode.NOT_FOUND, "分支不存在");

  await prisma.branchLike.create({ data: { userId: user.id, branchId } });

  const snippet =
    branch.direction.length > 80 ? branch.direction.slice(0, 80) + "…" : branch.direction;
  await createNotification({
    recipientId: branch.proposerId,
    type: "branch_like",
    payload: {
      actorId: user.id,
      actorName: user.displayName || user.username,
      actorUsername: user.username,
      actorAvatarUrl: user.avatarUrl,
      storyId: branch.storyId,
      storyTitle: branch.story.title,
      branchId,
      branchSnippet: snippet,
    },
  });

  const count = await prisma.branchLike.count({ where: { branchId } });
  revalidatePath("/story");
  return { liked: true, count };
}

/**
 * Promote a community branch into the canonical storyline. AUTHOR-ONLY. This is
 * the ONLY path that mutates canon (creates a real Chapter + bumps wordCount).
 */
export async function canonizeBranch(branchId: string) {
  const user = await requireDbUser();

  const branch = await prisma.storyBranch.findUnique({
    where: { id: branchId },
    include: { story: { select: { id: true, authorId: true, title: true } } },
  });
  if (!branch) throw new AppError(ErrorCode.NOT_FOUND, "分支不存在");
  if (branch.story.authorId !== user.id) {
    throw new AppError(ErrorCode.FORBIDDEN, "只有作者可以采纳分支为正章");
  }
  if (branch.status !== "ACTIVE") {
    throw new AppError(ErrorCode.VALIDATION, "该分支已被处理");
  }

  const newChapter = await prisma.$transaction(async (tx) => {
    // Next chapter number = current max + 1 (chapters are kept contiguous).
    const agg = await tx.chapter.aggregate({
      where: { storyId: branch.storyId },
      _max: { chapterNumber: true },
    });
    const nextChapterNumber = (agg._max.chapterNumber ?? 0) + 1;

    const chapter = await tx.chapter.create({
      data: {
        storyId: branch.storyId,
        title: branch.title,
        content: branch.content,
        chapterNumber: nextChapterNumber,
        wordCount: branch.wordCount,
      },
    });

    await tx.storyBranch.update({
      where: { id: branch.id },
      data: { status: "CANONIZED", canonizedChapterId: chapter.id },
    });

    await tx.story.update({
      where: { id: branch.storyId },
      // Canonizing a branch re-activates the serial — clear any 已完结 flag.
      data: { wordCount: { increment: branch.wordCount }, isComplete: false },
    });

    return chapter;
  });

  await createNotification({
    recipientId: branch.proposerId,
    type: "branch_canonized",
    payload: {
      actorId: user.id,
      actorName: user.displayName || user.username,
      actorUsername: user.username,
      actorAvatarUrl: user.avatarUrl,
      storyId: branch.storyId,
      storyTitle: branch.story.title,
      branchId: branch.id,
    },
  });

  revalidatePath(`/story/${branch.storyId}`);
  return { chapterId: newChapter.id, chapterNumber: newChapter.chapterNumber };
}

/** Author-only moderation: hide a branch from the tree. */
export async function hideBranch(branchId: string) {
  const user = await requireDbUser();
  const branch = await prisma.storyBranch.findUnique({
    where: { id: branchId },
    include: { story: { select: { id: true, authorId: true } } },
  });
  if (!branch) throw new AppError(ErrorCode.NOT_FOUND, "分支不存在");
  if (branch.story.authorId !== user.id) {
    throw new AppError(ErrorCode.FORBIDDEN, "无权操作");
  }
  await prisma.storyBranch.update({
    where: { id: branchId },
    data: { status: "HIDDEN" },
  });
  revalidatePath(`/story/${branch.storyId}`);
  return { ok: true };
}

/** Delete a branch. Allowed for the proposer or the story author. */
export async function deleteBranch(branchId: string) {
  const user = await requireDbUser();
  const branch = await prisma.storyBranch.findUnique({
    where: { id: branchId },
    include: { story: { select: { id: true, authorId: true } } },
  });
  if (!branch) throw new AppError(ErrorCode.NOT_FOUND, "分支不存在");
  if (branch.proposerId !== user.id && branch.story.authorId !== user.id) {
    throw new AppError(ErrorCode.FORBIDDEN, "无权删除该分支");
  }
  if (branch.status === "CANONIZED") {
    throw new AppError(ErrorCode.VALIDATION, "已采纳为正章的分支不可删除");
  }
  await prisma.storyBranch.delete({ where: { id: branchId } });
  revalidatePath(`/story/${branch.storyId}`);
  return { ok: true };
}
