"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// 热门排行榜. Ranks published stories by a composite engagement score
// (likes×3 + comments×2 + views×1). The time window filters by publishedAt so
// "本周/本月" surface newer hot works while "全部" is the all-time board.

export type TrendingWindow = "week" | "month" | "all";

export interface TrendingStory {
  id: string;
  title: string;
  summary: string | null;
  fandom: string;
  coverImageUrl: string | null;
  isComplete: boolean;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  score: number;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export async function getTrendingStories(
  window: TrendingWindow = "all",
  limit = 20
): Promise<TrendingStory[]> {
  const windowClause =
    window === "week"
      ? Prisma.sql`AND s."publishedAt" >= NOW() - INTERVAL '7 days'`
      : window === "month"
        ? Prisma.sql`AND s."publishedAt" >= NOW() - INTERVAL '30 days'`
        : Prisma.empty;

  // Rank in SQL; counts cast to int so they don't come back as BigInt.
  const ranked = await prisma.$queryRaw<{ id: string; score: number }[]>`
    SELECT s.id,
      (
        (SELECT COUNT(*) FROM "Like" l WHERE l."storyId" = s.id) * 3
        + (SELECT COUNT(*) FROM "Comment" c WHERE c."storyId" = s.id) * 2
        + s."viewCount"
      )::int AS score
    FROM "Story" s
    WHERE s.status = 'PUBLISHED' ${windowClause}
    ORDER BY score DESC, s."publishedAt" DESC NULLS LAST
    LIMIT ${limit}
  `;
  if (ranked.length === 0) return [];

  const scoreById = new Map(ranked.map((r) => [r.id, r.score]));
  const ids = ranked.map((r) => r.id);

  const stories = await prisma.story.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      summary: true,
      fandom: true,
      coverImageUrl: true,
      isComplete: true,
      viewCount: true,
      author: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const byId = new Map(stories.map((s) => [s.id, s]));
  // Preserve the SQL ranking order (findMany doesn't guarantee it).
  return ids
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      fandom: s.fandom,
      coverImageUrl: s.coverImageUrl,
      isComplete: s.isComplete,
      likeCount: s._count.likes,
      commentCount: s._count.comments,
      viewCount: s.viewCount,
      score: scoreById.get(s.id) ?? 0,
      author: s.author,
    }));
}
