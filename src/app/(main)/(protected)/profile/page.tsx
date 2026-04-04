import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    // This shouldn't happen because the (protected) layout already checks
    return null;
  }

  // Ensure user exists in database (auto-create if needed)
  let dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        stackAuthId: stackUser.id,
        email: stackUser.primaryEmail || `${stackUser.id}@fanficlab.local`,
        username:
          stackUser.displayName?.toLowerCase().replace(/\s+/g, "_") ||
          `user_${stackUser.id.slice(0, 8)}`,
        displayName: stackUser.displayName,
        avatarUrl: stackUser.profileImageUrl,
        preferences: { create: {} },
      },
    });
  }

  // Fetch all data server-side in a single pass (no race conditions)
  const [profile, stories, drafts, likedStories, statsRaw] = await Promise.all([
    prisma.user.findUnique({
      where: { id: dbUser.id },
      include: {
        preferences: true,
        _count: {
          select: {
            stories: true,
            followers: true,
            follows: true,
          },
        },
      },
    }),
    prisma.story.findMany({
      where: { authorId: dbUser.id },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
            chapters: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.draft.findMany({
      where: { userId: dbUser.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.like.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        story: {
          include: {
            _count: {
              select: {
                likes: true,
                comments: true,
                chapters: true,
              },
            },
          },
        },
      },
    }),
    prisma.$transaction([
      prisma.story.count({ where: { authorId: dbUser.id } }),
      prisma.story.count({ where: { authorId: dbUser.id, status: "PUBLISHED" } }),
      prisma.story.aggregate({
        where: { authorId: dbUser.id },
        _sum: { wordCount: true },
      }),
      prisma.like.count({ where: { story: { authorId: dbUser.id } } }),
      prisma.comment.count({ where: { story: { authorId: dbUser.id } } }),
      prisma.follow.count({ where: { followingId: dbUser.id } }),
    ]),
  ]);

  const stats = {
    totalStories: statsRaw[0],
    publishedStories: statsRaw[1],
    totalWords: statsRaw[2]._sum.wordCount || 0,
    totalLikes: statsRaw[3],
    totalComments: statsRaw[4],
    followers: statsRaw[5],
  };

  // Serialize dates for client component
  const serializedProfile = profile
    ? JSON.parse(JSON.stringify(profile))
    : null;
  const serializedStories = JSON.parse(JSON.stringify(stories));
  const serializedDrafts = JSON.parse(JSON.stringify(drafts));
  const serializedLikedStories = JSON.parse(
    JSON.stringify(likedStories.map((l) => l.story))
  );

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-4 py-8">
            <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
              <div className="space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-48 w-full rounded-xl" />
              </div>
              <Skeleton className="h-[600px] rounded-xl" />
            </div>
          </main>
        </div>
      }
    >
      <ProfileClient
        profile={serializedProfile}
        stories={serializedStories}
        drafts={serializedDrafts}
        likedStories={serializedLikedStories}
        stats={stats}
      />
    </Suspense>
  );
}
