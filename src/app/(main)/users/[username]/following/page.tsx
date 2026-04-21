import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, UserCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getFollowing } from "@/lib/actions/user";
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
  if (!user) return { title: "关注列表" };
  const name = user.displayName || user.username;
  return {
    title: `${name} 关注的人`,
    alternates: { canonical: absoluteUrl(`/users/${user.username}/following`) },
    openGraph: {
      title: `${name} 关注的人 - ${SITE_NAME}`,
      url: absoluteUrl(`/users/${user.username}/following`),
    },
  };
}

export default async function FollowingPage({ params }: PageProps) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      _count: { select: { follows: true } },
    },
  });
  if (!user) notFound();

  const following = await getFollowing(user.id, 100, 0);

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
            <UserCheck className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {user.displayName || user.username} 关注的人
            </h1>
            <p className="text-sm text-muted-foreground">
              共关注 {user._count.follows} 位作者
            </p>
          </div>
        </header>

        <UserList users={following} emptyText="尚未关注任何人" />
      </main>
    </div>
  );
}
