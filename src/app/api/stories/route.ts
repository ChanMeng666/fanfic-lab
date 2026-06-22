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
import { chargeGeneration } from "@/lib/actions/credits";
import { createNotification } from "@/lib/actions/notification";
import { onStorySaved } from "@/lib/actions/achievements";
import { CREDIT_COSTS, type StoryLength } from "@/lib/billing/pricing";

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
    const length: StoryLength =
      typeof body?.length === "string" && body.length in CREDIT_COSTS
        ? (body.length as StoryLength)
        : "short";
    const remixedFromIdInput =
      typeof body?.remixedFromId === "string" && body.remixedFromId.trim()
        ? body.remixedFromId.trim()
        : undefined;

    if (!result?.body || !result?.title) {
      return NextResponse.json({ error: "缺少故事数据" }, { status: 400 });
    }

    // Validate the remix source exists + is published before recording the edge.
    let remixSource: { id: string; authorId: string; title: string } | null = null;
    if (remixedFromIdInput) {
      remixSource = await prisma.story.findFirst({
        where: { id: remixedFromIdInput, status: "PUBLISHED" },
        select: { id: true, authorId: true, title: true },
      });
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
        remixedFromId: remixSource?.id,
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

    const generation = await prisma.generation.create({
      data: {
        userId: dbUser.id,
        type: "STORY",
        status: "COMPLETE",
        // `length` is persisted so the free-tier counter and the charge step
        // can bill the quoted flat cost the user saw before generating.
        request: { prompt, language: result.language, length } as object,
        deliverable: result as object,
        wordCount: result.wordCount,
        storyId: story.id,
      },
    });

    // Apply the credit charge for this generation. Failures here must not lose
    // the user's saved story, so we degrade gracefully.
    let creditsCharged = 0;
    let newBalance: number | undefined;
    try {
      const charge = await chargeGeneration(generation.id, dbUser.id, length);
      creditsCharged = charge.creditsCharged;
      newBalance = charge.newBalance;
    } catch (e) {
      logger.warn("stories.charge.failed", {
        generationId: generation.id,
        userId: dbUser.id,
        ...errorFields(e),
      });
    }

    // Achievements + creation streak (best-effort; never blocks the save).
    await onStorySaved(dbUser.id);

    // Notify the original author that their work was remixed (skips self-remix
    // via createNotification's actor check).
    if (remixSource) {
      await createNotification({
        recipientId: remixSource.authorId,
        type: "story_remixed",
        payload: {
          actorId: dbUser.id,
          actorName: dbUser.displayName || dbUser.username,
          actorUsername: dbUser.username,
          actorAvatarUrl: dbUser.avatarUrl,
          // storyId points at the NEW remix so the original author can read it.
          storyId: story.id,
          storyTitle: remixSource.title,
        },
      });
    }

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

    return NextResponse.json({ storyId: story.id, creditsCharged, newBalance });
  } catch (err) {
    logger.error("stories.save.failed", errorFields(err));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 500 }
    );
  }
}
