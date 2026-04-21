import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { EditStoryClient } from "./edit-client";

interface EditStoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStoryPage({ params }: EditStoryPageProps) {
  const { id } = await params;

  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    redirect("/handler/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
    select: { id: true },
  });
  if (!dbUser) {
    redirect("/handler/sign-in");
  }

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          title: true,
          content: true,
          chapterNumber: true,
          wordCount: true,
          authorNotes: true,
        },
      },
    },
  });

  if (!story) notFound();

  if (story.authorId !== dbUser.id) {
    // Non-author: bounce to read-only view.
    redirect(`/story/${id}`);
  }

  return (
    <EditStoryClient
      story={{
        id: story.id,
        title: story.title,
        summary: story.summary,
        fandom: story.fandom,
        ships: story.ships,
        tags: story.tags,
        rating: story.rating,
        status: story.status,
        chapters: story.chapters,
      }}
    />
  );
}
