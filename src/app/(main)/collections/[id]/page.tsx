import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { getCollection } from "@/lib/actions/collection";
import { CollectionDetailClient } from "@/components/collections/CollectionDetailClient";
import type { StoryCardData } from "@/components/feed";

interface CollectionDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CollectionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const c = await prisma.collection.findUnique({
    where: { id },
    select: { title: true, isPublic: true },
  });
  if (!c || !c.isPublic) return { title: "合集", robots: { index: false } };
  return { title: `${c.title} - 专题合集` };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { id } = await params;

  let viewerId: string | null = null;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const dbUser = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      viewerId = dbUser?.id ?? null;
    }
  } catch {
    // anonymous
  }

  const collection = await getCollection(id, viewerId);
  if (!collection) notFound();

  const stories: StoryCardData[] = collection.stories.map(({ story: s }) => ({
    id: s.id,
    title: s.title,
    summary: s.summary ?? "",
    fandom: s.fandom,
    ships: s.ships,
    tags: s.tags,
    rating: s.rating as "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT",
    status: s.isComplete ? "COMPLETE" : s.status === "DRAFT" ? "DRAFT" : "PUBLISHED",
    wordCount: s.wordCount,
    chapterCount: s._count.chapters,
    likes: s._count.likes,
    comments: s._count.comments,
    views: s.viewCount,
    coverUrl: s.coverImageUrl ?? undefined,
    author: {
      id: s.author.id,
      username: s.author.username,
      avatarUrl: s.author.avatarUrl ?? undefined,
    },
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <CollectionDetailClient
          id={collection.id}
          title={collection.title}
          description={collection.description}
          isPublic={collection.isPublic}
          owner={{ username: collection.owner.username, displayName: collection.owner.displayName }}
          isOwner={collection.owner.id === viewerId}
          stories={stories}
        />
      </main>
    </div>
  );
}
