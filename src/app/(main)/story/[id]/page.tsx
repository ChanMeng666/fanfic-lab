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
        take: 1,
        select: {
          id: true,
          title: true,
          content: true,
          chapterNumber: true,
          wordCount: true,
        },
      },
      _count: {
        select: { likes: true },
      },
    },
  });

  if (!story) {
    notFound();
  }

  // Check if the current user has liked this story
  let initialLiked = false;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const dbUser = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      if (dbUser) {
        const like = await prisma.like.findUnique({
          where: { userId_storyId: { userId: dbUser.id, storyId: id } },
        });
        initialLiked = !!like;
      }
    }
  } catch {
    // Not logged in, default to false
  }

  return (
    <div className="min-h-screen bg-background">
      <StoryReader
        story={story}
        initialLikeCount={story._count.likes}
        initialLiked={initialLiked}
      />
    </div>
  );
}
