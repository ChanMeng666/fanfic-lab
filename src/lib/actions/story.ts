"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { revalidatePath } from "next/cache";
import { Rating, StoryStatus } from "@prisma/client";
import { countWords } from "@/lib/wordcount";

// Types for action inputs
interface CreateStoryInput {
  title: string;
  summary?: string;
  fandom: string;
  ships: string[];
  tags: string[];
  rating?: Rating;
  content?: string;
}

interface UpdateStoryInput {
  id: string;
  title?: string;
  summary?: string;
  fandom?: string;
  ships?: string[];
  tags?: string[];
  rating?: Rating;
  status?: StoryStatus;
  coverImageUrl?: string;
}

interface CreateChapterInput {
  storyId: string;
  title?: string;
  content: string;
  authorNotes?: string;
}

interface UpdateChapterInput {
  id: string;
  title?: string;
  content?: string;
  authorNotes?: string;
}

// Helper to get current user
async function getCurrentUser() {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Find or create user in our database
  let dbUser = await prisma.user.findUnique({
    where: { stackAuthId: user.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        stackAuthId: user.id,
        email: user.primaryEmail || `${user.id}@fanficlab.local`,
        username: user.displayName?.toLowerCase().replace(/\s+/g, "_") || `user_${user.id.slice(0, 8)}`,
        displayName: user.displayName,
        avatarUrl: user.profileImageUrl,
      },
    });
  }

  return dbUser;
}

// ============================================
// STORY ACTIONS
// ============================================

export async function createStory(input: CreateStoryInput) {
  const user = await getCurrentUser();

  const story = await prisma.story.create({
    data: {
      title: input.title,
      summary: input.summary,
      fandom: input.fandom,
      ships: input.ships,
      tags: input.tags,
      rating: input.rating || Rating.GENERAL,
      authorId: user.id,
      chapters: input.content
        ? {
            create: {
              title: "Chapter 1",
              content: input.content,
              chapterNumber: 1,
              wordCount: input.content.split(/\s+/).filter(Boolean).length,
            },
          }
        : undefined,
    },
    include: {
      chapters: true,
      author: true,
    },
  });

  revalidatePath("/feed");
  revalidatePath(`/profile`);

  return story;
}

export async function updateStory(input: UpdateStoryInput) {
  const user = await getCurrentUser();

  // Verify ownership
  const existingStory = await prisma.story.findUnique({
    where: { id: input.id },
  });

  if (!existingStory || existingStory.authorId !== user.id) {
    throw new Error("Story not found or unauthorized");
  }

  const story = await prisma.story.update({
    where: { id: input.id },
    data: {
      title: input.title,
      summary: input.summary,
      fandom: input.fandom,
      ships: input.ships,
      tags: input.tags,
      rating: input.rating,
      status: input.status,
      coverImageUrl: input.coverImageUrl,
    },
    include: {
      chapters: true,
      author: true,
    },
  });

  revalidatePath("/feed");
  revalidatePath(`/story/${input.id}`);

  return story;
}

export async function deleteStory(storyId: string) {
  const user = await getCurrentUser();

  const story = await prisma.story.findUnique({
    where: { id: storyId },
  });

  if (!story || story.authorId !== user.id) {
    throw new Error("Story not found or unauthorized");
  }

  await prisma.story.delete({
    where: { id: storyId },
  });

  revalidatePath("/feed");
  revalidatePath("/profile");

  return { success: true };
}

export async function publishStory(storyId: string) {
  const user = await getCurrentUser();

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { chapters: true },
  });

  if (!story || story.authorId !== user.id) {
    throw new Error("Story not found or unauthorized");
  }

  if (story.chapters.length === 0) {
    throw new Error("Cannot publish a story with no chapters");
  }

  // Calculate total word count
  const totalWordCount = story.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  const updatedStory = await prisma.story.update({
    where: { id: storyId },
    data: {
      status: StoryStatus.PUBLISHED,
      publishedAt: new Date(),
      wordCount: totalWordCount,
    },
  });

  revalidatePath("/feed");
  revalidatePath(`/story/${storyId}`);

  return updatedStory;
}

export async function getStory(storyId: string) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
      },
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      characters: {
        include: {
          character: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  return story;
}

export async function getMyStories() {
  const user = await getCurrentUser();

  const stories = await prisma.story.findMany({
    where: { authorId: user.id },
    include: {
      _count: {
        select: {
          likes: true,
          comments: true,
          chapters: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return stories;
}

export async function getFeedStories(options?: {
  fandom?: string;
  tags?: string[];
  rating?: Rating;
  status?: StoryStatus;
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: "recent" | "popular" | "comments" | "words";
}) {
  // Build orderBy based on sortBy option
  type OrderByType =
    | { publishedAt: "desc" }
    | { likes: { _count: "desc" } }
    | { comments: { _count: "desc" } }
    | { wordCount: "desc" };

  const orderByMap: Record<string, OrderByType> = {
    recent: { publishedAt: "desc" },
    popular: { likes: { _count: "desc" } },
    comments: { comments: { _count: "desc" } },
    words: { wordCount: "desc" },
  };

  const orderBy = orderByMap[options?.sortBy || "recent"];

  const stories = await prisma.story.findMany({
    where: {
      status: options?.status || StoryStatus.PUBLISHED,
      ...(options?.fandom && { fandom: options.fandom }),
      ...(options?.tags?.length && { tags: { hasSome: options.tags } }),
      ...(options?.rating && { rating: options.rating }),
      // Search filter for title and summary
      ...(options?.search && {
        OR: [
          { title: { contains: options.search, mode: "insensitive" as const } },
          { summary: { contains: options.search, mode: "insensitive" as const } },
        ],
      }),
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          chapters: true,
        },
      },
    },
    orderBy,
    take: options?.limit || 20,
    skip: options?.offset || 0,
  });

  return stories;
}

// ============================================
// CHAPTER ACTIONS
// ============================================

export async function createChapter(input: CreateChapterInput) {
  const user = await getCurrentUser();

  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    include: { chapters: true },
  });

  if (!story || story.authorId !== user.id) {
    throw new Error("Story not found or unauthorized");
  }

  const nextChapterNumber = story.chapters.length + 1;
  const wordCount = input.content.split(/\s+/).filter(Boolean).length;

  const chapter = await prisma.chapter.create({
    data: {
      storyId: input.storyId,
      title: input.title || `Chapter ${nextChapterNumber}`,
      content: input.content,
      chapterNumber: nextChapterNumber,
      wordCount,
      authorNotes: input.authorNotes,
    },
  });

  // Update story word count
  await prisma.story.update({
    where: { id: input.storyId },
    data: {
      wordCount: { increment: wordCount },
    },
  });

  revalidatePath(`/story/${input.storyId}`);

  return chapter;
}

export async function updateChapter(input: UpdateChapterInput) {
  const user = await getCurrentUser();

  const chapter = await prisma.chapter.findUnique({
    where: { id: input.id },
    include: { story: true },
  });

  if (!chapter || chapter.story.authorId !== user.id) {
    throw new Error("Chapter not found or unauthorized");
  }

  const oldWordCount = chapter.wordCount;
  const newWordCount = input.content ? countWords(input.content) : oldWordCount;

  const updatedChapter = await prisma.chapter.update({
    where: { id: input.id },
    data: {
      title: input.title,
      content: input.content,
      authorNotes: input.authorNotes,
      wordCount: newWordCount,
    },
  });

  // Update story word count if content changed
  if (input.content && newWordCount !== oldWordCount) {
    await prisma.story.update({
      where: { id: chapter.storyId },
      data: {
        wordCount: { increment: newWordCount - oldWordCount },
      },
    });
  }

  revalidatePath(`/story/${chapter.storyId}`);

  return updatedChapter;
}

export async function deleteChapter(chapterId: string) {
  const user = await getCurrentUser();

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { story: true },
  });

  if (!chapter || chapter.story.authorId !== user.id) {
    throw new Error("Chapter not found or unauthorized");
  }

  // Delete and reorder remaining chapters
  await prisma.$transaction(async (tx) => {
    await tx.chapter.delete({ where: { id: chapterId } });

    // Reorder chapters
    await tx.chapter.updateMany({
      where: {
        storyId: chapter.storyId,
        chapterNumber: { gt: chapter.chapterNumber },
      },
      data: {
        chapterNumber: { decrement: 1 },
      },
    });

    // Update story word count
    await tx.story.update({
      where: { id: chapter.storyId },
      data: {
        wordCount: { decrement: chapter.wordCount },
      },
    });
  });

  revalidatePath(`/story/${chapter.storyId}`);

  return { success: true };
}

// ============================================
// SOCIAL ACTIONS
// ============================================

export async function toggleLike(storyId: string) {
  const user = await getCurrentUser();

  const existingLike = await prisma.like.findUnique({
    where: {
      userId_storyId: {
        userId: user.id,
        storyId,
      },
    },
  });

  if (existingLike) {
    await prisma.like.delete({
      where: { id: existingLike.id },
    });
    revalidatePath("/feed");
    return { liked: false };
  } else {
    await prisma.like.create({
      data: {
        userId: user.id,
        storyId,
      },
    });
    revalidatePath("/feed");
    return { liked: true };
  }
}

/**
 * Returns up to `limit` other PUBLISHED stories ranked by cosine
 * distance against the source story's embedding. Stories without an
 * embedding are excluded (they'll get one on next save / backfill).
 */
export async function getRelatedStories(storyId: string, limit = 4) {
  // First check the source has an embedding; if not, nothing to compare.
  const sourceCheck = await prisma.$queryRaw<{ has_embedding: boolean }[]>`
    SELECT (embedding IS NOT NULL) AS has_embedding
    FROM "Story" WHERE id = ${storyId}
  `;
  if (!sourceCheck[0]?.has_embedding) return [];

  const ranked = await prisma.$queryRaw<{ id: string; distance: number }[]>`
    SELECT id, embedding <=> (SELECT embedding FROM "Story" WHERE id = ${storyId}) AS distance
    FROM "Story"
    WHERE id != ${storyId}
      AND status = 'PUBLISHED'
      AND embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT ${limit}
  `;
  if (ranked.length === 0) return [];

  const ids = ranked.map((r) => r.id);
  const stories = await prisma.story.findMany({
    where: { id: { in: ids } },
    include: {
      author: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { likes: true, comments: true, chapters: true } },
    },
  });

  // Preserve cosine-distance ordering since findMany doesn't guarantee it.
  const byId = new Map(stories.map((s) => [s.id, s]));
  return ids.map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s);
}

export async function recordStoryView(storyId: string) {
  // Fire-and-forget. No auth required (anonymous reads count too).
  // Client dedupes per session via sessionStorage; this server action
  // is intentionally kept minimal — no rate limiting beyond that.
  await prisma.story.update({
    where: { id: storyId },
    data: { viewCount: { increment: 1 } },
    select: { id: true },
  });
  return { ok: true };
}

export async function getLikedStories() {
  const user = await getCurrentUser();

  const likes = await prisma.like.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      story: {
        include: {
          _count: {
            select: {
              likes: true,
              comments: true,
              chapters: true,
            },
          },
        },
      },
    },
  });

  return likes.map((like) => like.story);
}

export async function addComment(storyId: string, content: string, parentId?: string) {
  const user = await getCurrentUser();

  const trimmed = content.trim();
  if (trimmed.length < 1) throw new Error("评论内容不能为空");
  if (trimmed.length > 2000) throw new Error("评论过长（≤ 2000 字）");

  // Spam protection: 1 comment per user per 60 seconds.
  const recent = await prisma.comment.findFirst({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
    select: { id: true },
  });
  if (recent) throw new Error("发言太频繁，请稍后再试");

  // If replying, ensure the parent exists and belongs to the same story.
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { storyId: true, parentId: true },
    });
    if (!parent || parent.storyId !== storyId) {
      throw new Error("回复目标不存在");
    }
    // Flatten any reply-to-reply into a single nesting level so we don't
    // need a tree renderer; UX-wise replies all live under the top-level
    // thread anyway.
    if (parent.parentId) parentId = parent.parentId;
  }

  const comment = await prisma.comment.create({
    data: {
      content: trimmed,
      userId: user.id,
      storyId,
      parentId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  revalidatePath(`/story/${storyId}`);

  return comment;
}

export async function updateComment(commentId: string, content: string) {
  const user = await getCurrentUser();
  const trimmed = content.trim();
  if (trimmed.length < 1) throw new Error("评论内容不能为空");
  if (trimmed.length > 2000) throw new Error("评论过长（≤ 2000 字）");

  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true, storyId: true },
  });
  if (!existing) throw new Error("评论不存在");
  if (existing.userId !== user.id) throw new Error("无权编辑他人评论");

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content: trimmed },
  });
  revalidatePath(`/story/${existing.storyId}`);
  return updated;
}

export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true, storyId: true },
  });
  if (!existing) throw new Error("评论不存在");
  if (existing.userId !== user.id) throw new Error("无权删除他人评论");

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/story/${existing.storyId}`);
  return { ok: true };
}

export async function toggleCommentLike(commentId: string) {
  const user = await getCurrentUser();
  const existing = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId: user.id, commentId } },
  });
  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    return { liked: false };
  } else {
    // Validate target exists to avoid orphaned likes from stale UI.
    const target = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!target) throw new Error("评论不存在");
    await prisma.commentLike.create({
      data: { userId: user.id, commentId },
    });
    return { liked: true };
  }
}

export async function getComments(storyId: string, currentUserId?: string | null) {
  const comments = await prisma.comment.findMany({
    where: {
      storyId,
      parentId: null,
    },
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      _count: { select: { likes: true } },
      likes: currentUserId
        ? { where: { userId: currentUserId }, select: { id: true } }
        : false,
      replies: {
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          _count: { select: { likes: true } },
          likes: currentUserId
            ? { where: { userId: currentUserId }, select: { id: true } }
            : false,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Flatten the like-existence check into a boolean so client logic is simpler.
  type RawComment = (typeof comments)[number];
  type RawReply = RawComment["replies"][number];
  function shape(c: RawComment | RawReply) {
    const likeCount = c._count.likes;
    const likedByMe = "likes" in c && Array.isArray(c.likes) && c.likes.length > 0;
    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      userId: c.userId,
      user: c.user,
      likeCount,
      likedByMe,
    };
  }

  return comments.map((c) => ({
    ...shape(c),
    replies: c.replies.map(shape),
  }));
}
