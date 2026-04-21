import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import type { StoryResult } from "@/lib/types/dreamwriter";

// Phase 1 hotfix: Agent doesn't yet emit a `summary` field, so we generate
// one here to avoid the previous `body.substring(0, 200)` behavior that
// duplicated the opening of the chapter into card previews.
// Phase 5 will move this into the LangGraph pipeline as a `summarize` node
// and this helper can then be deleted.
async function generateSummary(title: string, body: string): Promise<string> {
  try {
    const model = new ChatOpenAI({
      temperature: 0.5,
      model: "gpt-4o-mini",
      maxTokens: 200,
    });
    const res = await model.invoke([
      new SystemMessage(
        "你是一位资深的中文同人小说编辑。给定一篇短篇小说，写一段 60~100 字的中文简介，吸引读者点开阅读，但不要剧透结局，也不要直接复述开头第一段。语气与小说本身风格一致。直接输出简介正文，不要任何前缀、引号或元描述。"
      ),
      new HumanMessage(`标题：${title}\n\n正文：\n${body.slice(0, 4000)}`),
    ]);
    const summary = (typeof res.content === "string" ? res.content : "").trim();
    if (summary.length >= 30 && summary.length <= 250) return summary;
    throw new Error(`summary length out of range: ${summary.length}`);
  } catch (e) {
    console.warn("[stories] summary generation failed, falling back:", e);
    // Mid-section fallback so the preview doesn't duplicate the opening
    // already rendered in the reader.
    const len = body.length;
    if (len <= 200) return body;
    const start = Math.floor(len / 2);
    return "…" + body.slice(start, start + 180).trim() + "…";
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

    const body = await req.json();
    const { result, prompt } = body as { result: StoryResult; prompt: string };

    if (!result?.body || !result?.title) {
      return NextResponse.json({ error: "缺少故事数据" }, { status: 400 });
    }

    const summary = await generateSummary(result.title, result.body);

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
            title: result.title,
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

    return NextResponse.json({ storyId: story.id });
  } catch (err) {
    console.error("[stories] Save failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "保存失败" },
      { status: 500 }
    );
  }
}
