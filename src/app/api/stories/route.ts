import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { logger, errorFields } from "@/lib/logger";
import { AppError, ErrorCode, isAppError } from "@/lib/errors";
import type { StoryResult } from "@/lib/types/dreamwriter";
import {
  embeddingTextForStory,
  getStoryEmbedding,
  setStoryEmbedding,
} from "@/lib/story-embedding";
import { applyGenerationCharge } from "@/lib/actions/credits";
import { createNotification } from "@/lib/actions/notification";
import { onStorySaved } from "@/lib/actions/achievements";
import { CREDIT_COSTS, type StoryLength } from "@/lib/billing/pricing";
import { parseBody, saveStoryBodySchema } from "@/lib/validation/api";

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

// Map the agent's G/T/M(/E) rating onto the Prisma Rating enum. Defaults to
// GENERAL when the rating is absent or unrecognized.
type Rating = "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT";
function mapRating(raw?: string): Rating {
  switch ((raw || "").trim().toUpperCase()) {
    case "T":
    case "TEEN":
      return "TEEN";
    case "M":
    case "MATURE":
      return "MATURE";
    case "E":
    case "X":
    case "EXPLICIT":
      return "EXPLICIT";
    default:
      return "GENERAL";
  }
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

    const { generationId, remixedFromId: remixedFromIdInput } = parseBody(
      saveStoryBodySchema,
      await req.json()
    );

    // Load the AUTHORITATIVE generation persisted by /api/create. The story
    // content, word count, and paid length all come from THIS row — never from
    // the client — so a forged request can't publish unbacked content or bill the
    // wrong (e.g. free) price. Ownership + single-use are enforced here.
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true, userId: true, type: true, storyId: true, deliverable: true, request: true },
    });
    if (!generation || generation.userId !== dbUser.id || generation.type !== "STORY") {
      return NextResponse.json({ error: "生成记录不存在" }, { status: 404 });
    }
    if (generation.storyId) {
      // Already saved — return the existing story id so a retry is idempotent.
      return NextResponse.json({ storyId: generation.storyId, creditsCharged: 0 });
    }

    const result = generation.deliverable as unknown as StoryResult | null;
    if (!result?.body || !result?.title) {
      return NextResponse.json({ error: "生成记录缺少故事数据" }, { status: 400 });
    }
    const length: StoryLength =
      ((): StoryLength => {
        const l = (generation.request as { length?: string } | null)?.length;
        return typeof l === "string" && l in CREDIT_COSTS ? (l as StoryLength) : "short";
      })();

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

    // Create the story, consume the generation (link storyId), and charge — all
    // atomically. If the charge can't be covered, the whole save rolls back and
    // nothing is published, so a paid story is never created unpaid.
    let creditsCharged = 0;
    let newBalance: number | undefined;
    let story: { id: string };
    try {
      const saved = await prisma.$transaction(async (tx) => {
        const created = await tx.story.create({
          data: {
            title: result.title,
            summary,
            fandom: "崩坏：星穹铁道",
            ships: result.cp,
            tags: result.tags,
            rating: mapRating(result.rating),
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
          select: { id: true },
        });
        // Consume the generation: link it to the story (single-use guard above).
        await tx.generation.update({
          where: { id: generation.id },
          data: { storyId: created.id },
        });
        const charge = await applyGenerationCharge(tx, generation.id, dbUser.id, length);
        return { created, charge };
      });
      story = saved.created;
      creditsCharged = saved.charge.creditsCharged;
      newBalance = saved.charge.newBalance;
    } catch (e) {
      if (isAppError(e) && e.code === ErrorCode.INSUFFICIENT_CREDITS) {
        logger.warn("stories.save.insufficient_credits", { generationId: generation.id, userId: dbUser.id });
        return NextResponse.json(
          { error: "额度不足，请充值后再试", code: "INSUFFICIENT_CREDITS" },
          { status: 402 }
        );
      }
      throw e instanceof AppError ? e : new AppError(ErrorCode.INTERNAL, "保存失败", e);
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
    if (isAppError(err) && err.code === ErrorCode.VALIDATION) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    logger.error("stories.save.failed", errorFields(err));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 500 }
    );
  }
}
