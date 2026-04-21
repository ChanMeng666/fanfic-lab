import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { StoryReader } from "@/components/story/StoryReader";
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
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          title: true,
          content: true,
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

  return (
    <div className="min-h-screen bg-background">
      <StoryReader
        story={story}
        initialLikeCount={story._count.likes}
        initialLiked={initialLiked}
        commentCount={story._count.comments}
        currentUserId={currentUserId}
        isOwner={isOwner}
      />
    </div>
  );
}
