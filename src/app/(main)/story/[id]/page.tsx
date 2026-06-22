import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { StoryReader } from "@/components/story/StoryReader";
import { RelatedStories } from "@/components/story/RelatedStories";
import { BranchTree } from "@/components/story/BranchTree";
import { getBranchTree } from "@/lib/actions/branch";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { id } = await params;
  const story = await prisma.story.findUnique({
    where: { id },
    select: {
      title: true,
      summary: true,
      fandom: true,
      ships: true,
      coverImageUrl: true,
      status: true,
      author: { select: { displayName: true, username: true } },
    },
  });

  if (!story || story.status === "DRAFT") {
    return {
      title: "故事未找到",
      robots: { index: false, follow: false },
    };
  }

  const authorName = story.author.displayName || story.author.username;
  const description =
    story.summary?.slice(0, 200) ?? `${authorName} 的同人文，关于 ${story.fandom}。`;
  const title = `${story.title} - ${authorName}`;
  const url = absoluteUrl(`/story/${id}`);
  const images = story.coverImageUrl ? [{ url: story.coverImageUrl }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "article",
      authors: [authorName],
      tags: [story.fandom, ...story.ships],
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: story.coverImageUrl ? [story.coverImageUrl] : undefined,
    },
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          displayName: true,
          username: true,
        },
      },
      // Metadata only — chapter bodies are not shipped to the overview. The
      // single-chapter body is fetched separately below; multi-chapter serials
      // read each chapter on its own /chapter/[n] page.
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          title: true,
          chapterNumber: true,
          wordCount: true,
        },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  if (!story) {
    notFound();
  }

  // One-shots (single chapter) stay a one-page read: pull that chapter's body
  // so the overview can render it inline.
  let firstChapterContent: string | null = null;
  if (story.chapters.length === 1) {
    const first = await prisma.chapter.findFirst({
      where: { storyId: id },
      orderBy: { chapterNumber: "asc" },
      select: { content: true },
    });
    firstChapterContent = first?.content ?? null;
  }

  let initialLiked = false;
  let currentUserId: string | null = null;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const dbUser = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      if (dbUser) {
        currentUserId = dbUser.id;
        const like = await prisma.like.findUnique({
          where: { userId_storyId: { userId: dbUser.id, storyId: id } },
        });
        initialLiked = !!like;
      }
    }
  } catch {
    // Not logged in
  }

  const isOwner = currentUserId === story.authorId;

  // Community branch续写 tree (only meaningful for published stories with at
  // least one chapter). Branches live outside the canonical chapters.
  const branches =
    story.status === "PUBLISHED" && story.chapters.length > 0
      ? await getBranchTree(id, currentUserId)
      : [];

  return (
    <div className="min-h-screen bg-background">
      <StoryReader
        story={story}
        chapters={story.chapters}
        firstChapterContent={firstChapterContent}
        initialLikeCount={story._count.likes}
        initialLiked={initialLiked}
        commentCount={story._count.comments}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />
      <div className="max-w-3xl mx-auto px-3 sm:px-4 pb-10">
        {story.status === "PUBLISHED" && story.chapters.length > 0 && (
          <BranchTree
            storyId={id}
            chapters={story.chapters}
            branches={branches}
            currentUserId={currentUserId}
            isOwner={isOwner}
            allowBranching={story.allowBranching}
            isLoggedIn={currentUserId !== null}
          />
        )}
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <Suspense fallback={null}>
          <RelatedStories storyId={id} />
        </Suspense>
      </div>
    </div>
  );
}
