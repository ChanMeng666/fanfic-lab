import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import type { StoryResult } from "@/lib/types/dreamwriter";

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

    const story = await prisma.story.create({
      data: {
        title: result.title,
        summary: result.body.substring(0, 200),
        fandom: "崩坏：星穹铁道",
        ships: result.cp,
        tags: result.tags,
        rating: "GENERAL",
        status: "DRAFT",
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
