import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { ChapterReader } from "@/components/story/ChapterReader";
import { absoluteUrl } from "@/lib/site";

interface ChapterPageProps {
  params: Promise<{ id: string; n: string }>;
}

function parseChapterNumber(n: string): number | null {
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { id, n } = await params;
  const chapterNumber = parseChapterNumber(n);
  if (chapterNumber === null) return { title: "章节未找到", robots: { index: false } };

  const story = await prisma.story.findUnique({
    where: { id },
    select: {
      title: true,
      status: true,
      author: { select: { displayName: true, username: true } },
    },
  });
  if (!story || story.status === "DRAFT") {
    return { title: "章节未找到", robots: { index: false, follow: false } };
  }

  const chapter = await prisma.chapter.findUnique({
    where: { storyId_chapterNumber: { storyId: id, chapterNumber } },
    select: { title: true },
  });
  if (!chapter) return { title: "章节未找到", robots: { index: false } };

  const authorName = story.author.displayName || story.author.username;
  const chapterLabel = chapter.title ? `第 ${chapterNumber} 章：${chapter.title}` : `第 ${chapterNumber} 章`;
  const url = absoluteUrl(`/story/${id}/chapter/${chapterNumber}`);

  return {
    title: `${chapterLabel} - ${story.title} - ${authorName}`,
    alternates: { canonical: url },
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { id, n } = await params;
  const chapterNumber = parseChapterNumber(n);
  if (chapterNumber === null) notFound();

  const story = await prisma.story.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      authorId: true,
      status: true,
      allowBranching: true,
      author: { select: { username: true, displayName: true } },
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: { chapterNumber: true, title: true },
      },
    },
  });
  if (!story) notFound();

  const chapter = await prisma.chapter.findUnique({
    where: { storyId_chapterNumber: { storyId: id, chapterNumber } },
    select: {
      id: true,
      title: true,
      content: true,
      chapterNumber: true,
      wordCount: true,
    },
  });
  if (!chapter) notFound();

  let isOwner = false;
  let isLoggedIn = false;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const dbUser = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      isLoggedIn = !!dbUser;
      isOwner = dbUser?.id === story.authorId;
    }
  } catch {
    // Anonymous reader
  }

  return (
    <div className="min-h-screen bg-background">
      <ChapterReader
        storyId={story.id}
        storyTitle={story.title}
        chapter={chapter}
        chapters={story.chapters}
        isOwner={isOwner}
        isLoggedIn={isLoggedIn}
        allowBranching={story.status === "PUBLISHED" && story.allowBranching}
      />
    </div>
  );
}
