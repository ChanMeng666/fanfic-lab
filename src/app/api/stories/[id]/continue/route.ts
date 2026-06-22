import { NextRequest } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { prisma } from "@/lib/db";
import { chargeContinuation } from "@/lib/actions/credits";
import { generateContinuation } from "@/lib/actions/continuation-core";

// Direct LLM continuation, bypassing the agent graph. We only need a single
// writer call here — there's no outline / quality / revision loop. The writer
// call + prompt + title generation live in continuation-core.ts, shared with
// the community branch route. If we later want OOC checks etc, we can re-route
// this through the agent.

interface ContinueBody {
  direction: string;
}

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

  let body: ContinueBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const direction = (body.direction ?? "").trim();
  if (direction.length < 5) {
    return new Response(
      JSON.stringify({ error: "请描述下一章的方向（至少 5 字）" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (direction.length > 1000) {
    return new Response(
      JSON.stringify({ error: "方向描述过长（≤ 1000 字）" }),
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

        const newChapter = await prisma.chapter.create({
          data: {
            storyId,
            title: chapterTitle,
            content,
            chapterNumber: nextChapterNumber,
            wordCount,
          },
        });

        await prisma.story.update({
          where: { id: storyId },
          // Adding a chapter means the serial is active again — clear any
          // 已完结 flag so it shows as 连载中.
          data: { wordCount: { increment: wordCount }, isComplete: false },
        });

        // Record the continuation on the generation ledger and charge it
        // (word-based). Charge failures must not lose the saved chapter.
        let creditsCharged = 0;
        let newBalance: number | undefined;
        try {
          const generation = await prisma.generation.create({
            data: {
              userId: dbUser.id,
              type: "CONTINUATION",
              status: "COMPLETE",
              request: { direction, storyId } as object,
              wordCount,
              storyId,
            },
          });
          const charge = await chargeContinuation(generation.id, dbUser.id, wordCount);
          creditsCharged = charge.creditsCharged;
          newBalance = charge.newBalance;
        } catch (e) {
          console.warn("[stories/continue] charge failed:", e);
        }

        send({
          stage: "complete",
          message: chapterTitle
            ? `第 ${nextChapterNumber} 章「${chapterTitle}」已添加（${wordCount.toLocaleString()} 字）`
            : `第 ${nextChapterNumber} 章已添加（${wordCount.toLocaleString()} 字）`,
          chapterId: newChapter.id,
          chapterNumber: nextChapterNumber,
          chapterTitle,
          wordCount,
          creditsCharged,
          newBalance,
        });
      } catch (err) {
        console.error("[stories/continue] failed:", err);
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
