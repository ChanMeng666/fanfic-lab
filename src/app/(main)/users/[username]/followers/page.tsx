import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getFollowers } from "@/lib/actions/user";
import { UserList } from "@/components/user/UserList";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { displayName: true, username: true },
  });
  if (!user) return { title: "粉丝列表" };
  const name = user.displayName || user.username;
  return {
    title: `${name} 的粉丝`,
    alternates: { canonical: absoluteUrl(`/users/${user.username}/followers`) },
    openGraph: {
      title: `${name} 的粉丝 - ${SITE_NAME}`,
      url: absoluteUrl(`/users/${user.username}/followers`),
    },
  };
}

export default async function FollowersPage({ params }: PageProps) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      _count: { select: { followers: true } },
    },
  });
  if (!user) notFound();

  const followers = await getFollowers(user.id, 100, 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link
          href={`/users/${user.username}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          返回 {user.displayName || user.username} 的主页
        </Link>

        <header className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {user.displayName || user.username} 的粉丝
            </h1>
            <p className="text-sm text-muted-foreground">
              共 {user._count.followers} 位关注者
            </p>
          </div>
        </header>

        <UserList users={followers} emptyText="还没有粉丝" />
      </main>
    </div>
  );
}
