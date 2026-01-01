"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { revalidatePath } from "next/cache";
import { Rating, StoryStatus } from "@prisma/client";

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
  revalidatePath(`/editor/${input.id}`);

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
  revalidatePath(`/editor/${storyId}`);

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
}) {
  const stories = await prisma.story.findMany({
    where: {
      status: options?.status || StoryStatus.PUBLISHED,
      ...(options?.fandom && { fandom: options.fandom }),
      ...(options?.tags?.length && { tags: { hasSome: options.tags } }),
      ...(options?.rating && { rating: options.rating }),
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
    orderBy: { publishedAt: "desc" },
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

  revalidatePath(`/editor/${input.storyId}`);

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
  const newWordCount = input.content
    ? input.content.split(/\s+/).filter(Boolean).length
    : oldWordCount;

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

  revalidatePath(`/editor/${chapter.storyId}`);

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

  revalidatePath(`/editor/${chapter.storyId}`);

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

export async function addComment(storyId: string, content: string, parentId?: string) {
  const user = await getCurrentUser();

  const comment = await prisma.comment.create({
    data: {
      content,
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

export async function getComments(storyId: string) {
  const comments = await prisma.comment.findMany({
    where: {
      storyId,
      parentId: null, // Get top-level comments
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
      replies: {
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
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return comments;
}
