import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
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
    },
  });

  if (!story) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <StoryReader story={story} />
    </div>
  );
}
