import { NextRequest } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { prisma } from "@/lib/db";
import { applyContinuationCharge } from "@/lib/actions/credits";
import { generateContinuation } from "@/lib/actions/continuation-core";
import { logger, errorFields } from "@/lib/logger";
import { ErrorCode, isAppError } from "@/lib/errors";
import { parseBody, continueBodySchema } from "@/lib/validation/api";

// Direct LLM continuation, bypassing the agent graph. We only need a single
// writer call here — there's no outline / quality / revision loop. The writer
// call + prompt + title generation live in continuation-core.ts, shared with
// the community branch route. If we later want OOC checks etc, we can re-route
// this through the agent.

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await context.params;

  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
    select: { id: true },
  });
  if (!dbUser) {
    return new Response(JSON.stringify({ error: "用户不存在" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
      },
    },
  });

  if (!story) {
    return new Response(JSON.stringify({ error: "故事不存在" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (story.authorId !== dbUser.id) {
    return new Response(JSON.stringify({ error: "无权续写他人作品" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Continuations are always paid (word-based, min 1 credit). Gate on having
  // at least the minimum charge available before spending an LLM call.
  const credits = await prisma.userCredits.findUnique({
    where: { userId: dbUser.id },
    select: { balance: true },
  });
  if ((credits?.balance ?? 0) < 1) {
    return new Response(
      JSON.stringify({ error: "额度不足，请充值后再续写", code: "INSUFFICIENT_CREDITS" }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  let direction: string;
  try {
    const raw = await request.json();
    ({ direction } = parseBody(continueBodySchema, raw));
  } catch (e) {
    return new Response(
      JSON.stringify({ error: isAppError(e) ? e.message : "请求格式错误" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const lastChapter = story.chapters[story.chapters.length - 1];
  const nextChapterNumber = (lastChapter?.chapterNumber ?? 0) + 1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const { content, title: chapterTitle, wordCount } = await generateContinuation(
          {
            story,
            priorChapters: story.chapters,
            direction,
            nextChapterNumber,
          },
          send
        );

        send({ stage: "saving", message: "正在保存章节…" });

        // Persist the chapter, bump the story, ledger the generation, and charge —
        // all atomically. A charge that can't be covered (rare: balance dropped
        // since the gate) rolls the whole save back rather than adding an unpaid
        // chapter or going negative.
        let newChapterId: string;
        let creditsCharged = 0;
        let newBalance: number | undefined;
        try {
          const saved = await prisma.$transaction(async (tx) => {
            const newChapter = await tx.chapter.create({
              data: { storyId, title: chapterTitle, content, chapterNumber: nextChapterNumber, wordCount },
              select: { id: true },
            });
            await tx.story.update({
              where: { id: storyId },
              // Adding a chapter means the serial is active again — clear any
              // 已完结 flag so it shows as 连载中.
              data: { wordCount: { increment: wordCount }, isComplete: false },
            });
            const generation = await tx.generation.create({
              data: { userId: dbUser.id, type: "CONTINUATION", status: "COMPLETE", request: { direction, storyId } as object, wordCount, storyId },
              select: { id: true },
            });
            const charge = await applyContinuationCharge(tx, generation.id, dbUser.id, wordCount);
            return { newChapterId: newChapter.id, charge };
          });
          newChapterId = saved.newChapterId;
          creditsCharged = saved.charge.creditsCharged;
          newBalance = saved.charge.newBalance;
        } catch (e) {
          logger.error("stories.continue.persist_failed", { storyId, userId: dbUser.id, ...errorFields(e) });
          send({
            stage: "error",
            error: isAppError(e) && e.code === ErrorCode.INSUFFICIENT_CREDITS
              ? "额度不足，请充值后再续写"
              : "保存章节失败，请重试",
          });
          return;
        }

        send({
          stage: "complete",
          message: chapterTitle
            ? `第 ${nextChapterNumber} 章「${chapterTitle}」已添加（${wordCount.toLocaleString()} 字）`
            : `第 ${nextChapterNumber} 章已添加（${wordCount.toLocaleString()} 字）`,
          chapterId: newChapterId,
          chapterNumber: nextChapterNumber,
          chapterTitle,
          wordCount,
          creditsCharged,
          newBalance,
        });
      } catch (err) {
        logger.error("stories.continue.failed", { storyId, ...errorFields(err) });
        send({
          stage: "error",
          error: err instanceof Error ? err.message : "续写失败",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
