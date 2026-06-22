"use server";

import { prisma } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";

// 二创/衍生: a remix is a brand-new story seeded from an existing one. This
// action only builds a SEED to prefill the create page — it does NOT generate
// anything. Generation goes through the normal create flow; the remixedFromId
// edge is persisted by /api/stories at save time.

export interface RemixSeed {
  sourceId: string;
  sourceTitle: string;
  sourceAuthor: string;
  fandom: string;
  ships: string[];
  tags: string[];
  /** Editable prompt prefilled into the create input. */
  prompt: string;
}

export async function createRemixSeed(sourceStoryId: string): Promise<RemixSeed> {
  const story = await prisma.story.findUnique({
    where: { id: sourceStoryId },
    select: {
      id: true,
      title: true,
      summary: true,
      fandom: true,
      ships: true,
      tags: true,
      status: true,
      author: { select: { username: true, displayName: true } },
    },
  });
  if (!story || story.status !== "PUBLISHED") {
    throw new AppError(ErrorCode.NOT_FOUND, "原作不存在或未公开");
  }

  const cp = story.ships.length ? `CP 为${story.ships.join("、")}` : "";
  const tagPart = story.tags.length ? `，包含${story.tags.join("、")}等元素` : "";
  const prompt = `以《${story.title}》为灵感，写一篇新的同人故事${cp ? "，" + cp : ""}${tagPart}。可以延续设定，也可以大胆改写出你自己的走向。`;

  return {
    sourceId: story.id,
    sourceTitle: story.title,
    sourceAuthor: story.author.displayName || story.author.username,
    fandom: story.fandom,
    ships: story.ships,
    tags: story.tags,
    prompt,
  };
}

/** Published derivative works of a story, newest first (for the 衍生作品 list). */
export async function getRemixes(storyId: string, limit = 12) {
  const remixes = await prisma.story.findMany({
    where: { remixedFromId: storyId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      author: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  });
  return remixes;
}
