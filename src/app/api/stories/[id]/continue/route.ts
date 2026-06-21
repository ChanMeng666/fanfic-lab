import { NextRequest } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { stackServerApp } from "@/lib/stack";
import { prisma } from "@/lib/db";
import { countWords } from "@/lib/wordcount";
import { chargeContinuation } from "@/lib/actions/credits";

// Direct LLM continuation, bypassing the agent graph. We only need a single
// writer call here — there's no outline / quality / revision loop. If we
// later want OOC checks etc, we can re-route this through the agent.

const CONTINUE_PROMPT = `你是一位顶尖的同人文作者，正在为一篇连载中的同人文写新的一章。读者已经读完前面所有章节，你需要根据作者的指示，自然衔接地写出下一章。

写作要求：
1. 【角色一致】严格保持已有章节中的角色性格、说话方式与行为习惯
2. 【自然衔接】读完上一章末尾的那位读者，应该能无缝接到这一章的开头，不要总结上一章发生了什么
3. 【独立张力】这一章本身要有起承转合，不要写成「过场」
4. 【篇幅】2000~4000 字
5. 【风格统一】文笔、节奏、氛围与已有章节保持一致

输出要求：直接输出本章正文，不要加章节标题、不要加作者注、不要加任何元信息。`;

const CHAPTER_TITLE_PROMPT = `请为以下同人文章节拟一个简洁的中文章节标题。

要求：
1. 4~10 字
2. 有诗意，能引发读者兴趣
3. 不要剧透关键转折
4. 不要带「第 X 章」字样，不要引号
5. 直接输出标题，不要任何前缀或额外文字

只输出标题本身。`;

async function generateChapterTitle(content: string): Promise<string | null> {
  try {
    const model = new ChatOpenAI({
      temperature: 0.6,
      model: "gpt-4o-mini",
      maxTokens: 30,
    });
    const res = await model.invoke([
      new SystemMessage(CHAPTER_TITLE_PROMPT),
      new HumanMessage(content.slice(0, 3000)),
    ]);
    const raw = (typeof res.content === "string" ? res.content : "").trim();
    const cleaned = raw
      .replace(/^["「『《]|["」』》]$/g, "")
      .replace(/^第.{1,4}章[：:]?\s*/, "")
      .trim();
    if (cleaned.length < 2 || cleaned.length > 20) return null;
    return cleaned;
  } catch (e) {
    console.warn("[continue] chapter title generation failed:", e);
    return null;
  }
}

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

  // Context summarization strategy: include short previews of every prior
  // chapter, plus the full tail (~2000 chars) of the most recent chapter for
  // continuity. Keeps the prompt under ~6k tokens for typical stories.
  const priorPreviews = story.chapters
    .map((c, i) => {
      const head = c.content.slice(0, 200).trim();
      const titlePart = c.title ? `「${c.title}」` : "";
      return `第${i + 1}章${titlePart}（${c.wordCount} 字）：${head}…`;
    })
    .join("\n");

  const lastChapterTail = lastChapter
    ? lastChapter.content.slice(-2000).trim()
    : "";

  const userMsg = `【故事标题】${story.title}
${story.summary ? `【作品简介】${story.summary}\n` : ""}【作品】${story.fandom}
【CP】${story.ships.join("、") || "无"}
【标签】${story.tags.join("、") || "无"}

【已有章节预览】
${priorPreviews || "（暂无）"}

${lastChapterTail ? `【最近一章末尾约 2000 字，用于衔接】\n${lastChapterTail}\n` : ""}
【作者指定的本章方向】
${direction}

请基于以上信息，写出第 ${nextChapterNumber} 章的完整正文。`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        send({ stage: "writing", message: `正在续写第 ${nextChapterNumber} 章…` });

        const model = new ChatOpenAI({
          temperature: 0.9,
          model: "gpt-4o",
        });
        const response = await model.invoke([
          new SystemMessage(CONTINUE_PROMPT),
          new HumanMessage(userMsg),
        ]);
        const content = (
          typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content)
        ).trim();

        if (content.length < 200) {
          send({ stage: "error", error: "生成的章节过短，请重试或调整描述" });
          controller.close();
          return;
        }

        send({ stage: "titling", message: "正在为本章拟标题…" });
        const chapterTitle = await generateChapterTitle(content);

        send({ stage: "saving", message: "正在保存章节…" });

        const wordCount = countWords(content);

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
          data: { wordCount: { increment: wordCount } },
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
