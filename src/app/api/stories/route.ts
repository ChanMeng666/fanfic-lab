import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { logger, errorFields } from "@/lib/logger";
import type { StoryResult } from "@/lib/types/dreamwriter";
import {
  embeddingTextForStory,
  getStoryEmbedding,
  setStoryEmbedding,
} from "@/lib/story-embedding";

// Defensive fallback when the agent payload is missing `summary` (older
// in-flight requests that started before the summarize node was deployed,
// or when the summarize node itself failed). Picks a mid-section slice so
// the preview never duplicates the chapter opening.
function fallbackSummary(body: string): string {
  const len = body.length;
  if (len <= 200) return body;
  const start = Math.floor(len / 2);
  return "…" + body.slice(start, start + 180).trim() + "…";
}

export async function POST(req: NextRequest) {
  try {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { stackAuthId: stackUser.id },
    });
    if (!dbUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { result, prompt } = body as { result: StoryResult; prompt: string };

    if (!result?.body || !result?.title) {
      return NextResponse.json({ error: "缺少故事数据" }, { status: 400 });
    }

    const summary =
      result.summary && result.summary.trim().length >= 30
        ? result.summary.trim()
        : fallbackSummary(result.body);

    const story = await prisma.story.create({
      data: {
        title: result.title,
        summary,
        fandom: "崩坏：星穹铁道",
        ships: result.cp,
        tags: result.tags,
        rating: "GENERAL",
        status: "PUBLISHED",
        publishedAt: new Date(),
        wordCount: result.wordCount,
        authorId: dbUser.id,
        chapters: {
          create: {
            // Don't duplicate the story title onto its only chapter — when
            // a second chapter is added later via /api/stories/[id]/continue
            // it gets an auto-generated chapter title, and the reader UI
            // relies on chapter.title being null/distinct to avoid showing
            // a redundant h2.
            title: null,
            content: result.body,
            chapterNumber: 1,
            wordCount: result.wordCount,
          },
        },
      },
    });

    await prisma.generation.create({
      data: {
        userId: dbUser.id,
        type: "STORY",
        status: "COMPLETE",
        request: { prompt, language: result.language } as object,
        deliverable: result as object,
        wordCount: result.wordCount,
        storyId: story.id,
      },
    });

    // Generate recommendation embedding asynchronously so it never blocks
    // the create-story response. The user gets their storyId immediately;
    // the embedding lands a couple of seconds later.
    void (async () => {
      const text = embeddingTextForStory({
        title: result.title,
        summary,
        fandom: "崩坏：星穹铁道",
        ships: result.cp,
        tags: result.tags,
      });
      const embedding = await getStoryEmbedding(text);
      if (embedding) {
        try {
          await setStoryEmbedding(story.id, embedding);
        } catch (e) {
          logger.warn("stories.embedding.failed", { storyId: story.id, ...errorFields(e) });
        }
      }
    })();

    return NextResponse.json({ storyId: story.id });
  } catch (err) {
    logger.error("stories.save.failed", errorFields(err));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 500 }
    );
  }
}
