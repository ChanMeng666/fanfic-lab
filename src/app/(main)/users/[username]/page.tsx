import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoryCard, type StoryCardData } from "@/components/feed";
import { Edit, Calendar, BookOpen } from "lucide-react";
import { FollowButton } from "@/components/user/FollowButton";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;

  const profile = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      stories: {
        where: { status: "PUBLISHED" },
        include: {
          _count: { select: { likes: true, comments: true, chapters: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 30,
      },
      _count: {
        select: {
          stories: { where: { status: "PUBLISHED" } },
          followers: true,
          follows: true,
        },
      },
    },
  });

  if (!profile) notFound();

  let currentUserId: string | null = null;
  let isFollowing = false;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const me = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      if (me) {
        currentUserId = me.id;
        if (me.id !== profile.id) {
          const follow = await prisma.follow.findUnique({
            where: {
              followerId_followingId: { followerId: me.id, followingId: profile.id },
            },
          });
          isFollowing = !!follow;
        }
      }
    }
  } catch {
    // anonymous viewer
  }

  const isOwnProfile = currentUserId === profile.id;

  const cards: StoryCardData[] = profile.stories.map((story) => ({
    id: story.id,
    title: story.title,
    summary: story.summary ?? "",
    fandom: story.fandom,
    ships: story.ships,
    tags: story.tags,
    rating: (["GENERAL", "TEEN", "MATURE", "EXPLICIT"] as const).includes(
      story.rating as never
    )
      ? (story.rating as "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT")
      : "GENERAL",
    status: (["DRAFT", "PUBLISHED", "COMPLETE"] as const).includes(story.status as never)
      ? (story.status as "DRAFT" | "PUBLISHED" | "COMPLETE")
      : "PUBLISHED",
    wordCount: story.wordCount,
    chapterCount: story._count.chapters,
    likes: story._count.likes,
    comments: story._count.comments,
    coverUrl: story.coverImageUrl ?? undefined,
    author: {
      id: profile.id,
      username: profile.username,
      avatarUrl: profile.avatarUrl ?? undefined,
    },
    updatedAt: (story.publishedAt ?? story.updatedAt).toISOString(),
  }));

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 ring-4 ring-secondary">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {profile.displayName || profile.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3" />
                    {new Date(profile.createdAt).toLocaleDateString("zh-CN")} 加入
                  </p>

                  <div className="mt-4">
                    {isOwnProfile ? (
                      <Link href="/profile">
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Edit className="size-3.5" />
                          编辑资料
                        </Button>
                      </Link>
                    ) : (
                      <FollowButton
                        targetUserId={profile.id}
                        initialFollowing={isFollowing}
                        canFollow={!!currentUserId}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.stories}
                    </div>
                    <div className="text-xs text-muted-foreground">作品</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.followers}
                    </div>
                    <div className="text-xs text-muted-foreground">粉丝</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.follows}
                    </div>
                    <div className="text-xs text-muted-foreground">关注</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section>
            <header className="mb-6">
              <h2 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="size-6 text-primary" />
                作品 ({profile._count.stories})
              </h2>
            </header>
            {cards.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                    <BookOpen className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">该作者还没有公开的作品</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {cards.map((c) => (
                  <StoryCard key={c.id} story={c} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
