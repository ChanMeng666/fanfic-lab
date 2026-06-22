import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { Skeleton } from "@/components/ui/skeleton";
import { getContinueReading } from "@/lib/actions/reading-progress";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    // (protected) layout should already redirect; this is a defensive fallback.
    redirect("/handler/sign-in");
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
  const [profile, stories, likedStories, bookmarkedStories, statsRaw] = await Promise.all([
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
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
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
    prisma.like.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        story: {
          include: {
            author: {
              select: { id: true, username: true, avatarUrl: true },
            },
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
    prisma.bookmark.findMany({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        story: {
          include: {
            author: {
              select: { id: true, username: true, avatarUrl: true },
            },
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
  const serializedLikedStories = JSON.parse(
    JSON.stringify(likedStories.map((l) => l.story))
  );
  const serializedBookmarkedStories = JSON.parse(
    JSON.stringify(bookmarkedStories.map((b) => b.story))
  );

  const continueReading = await getContinueReading();

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
        likedStories={serializedLikedStories}
        bookmarkedStories={serializedBookmarkedStories}
        continueReading={continueReading}
        stats={stats}
      />
    </Suspense>
  );
}
