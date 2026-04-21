import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { StoryReader } from "@/components/story/StoryReader";

interface StoryPageProps {
  params: Promise<{ id: string }>;
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

  return (
    <div className="min-h-screen bg-background">
      <StoryReader
        story={story}
        initialLikeCount={story._count.likes}
        initialLiked={initialLiked}
        commentCount={story._count.comments}
        currentUserId={currentUserId}
      />
    </div>
  );
}
