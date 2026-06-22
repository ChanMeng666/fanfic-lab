import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, GitBranch, Check } from "lucide-react";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getBranch } from "@/lib/actions/branch";
import { BranchPageActions } from "@/components/story/BranchPageActions";

interface BranchPageProps {
  params: Promise<{ id: string; branchId: string }>;
}

export const metadata: Metadata = {
  // Branches are reader-contributed alternate timelines, not canonical content.
  robots: { index: false, follow: true },
};

export default async function BranchPage({ params }: BranchPageProps) {
  const { id: storyId, branchId } = await params;

  const branch = await getBranch(branchId);
  if (!branch || branch.story.id !== storyId || branch.status === "HIDDEN") {
    notFound();
  }

  let currentUserId: string | null = null;
  try {
    const stackUser = await stackServerApp.getUser();
    if (stackUser) {
      const dbUser = await prisma.user.findUnique({
        where: { stackAuthId: stackUser.id },
        select: { id: true },
      });
      currentUserId = dbUser?.id ?? null;
    }
  } catch {
    // Anonymous reader
  }

  let likedByMe = false;
  if (currentUserId) {
    const like = await prisma.branchLike.findUnique({
      where: { userId_branchId: { userId: currentUserId, branchId } },
      select: { id: true },
    });
    likedByMe = !!like;
  }

  const isOwner = currentUserId === branch.story.authorId;
  const isCanonized = branch.status === "CANONIZED";
  const proposerName = branch.proposer.displayName || branch.proposer.username;
  const forkLabel = branch.parentChapter
    ? `续写自第 ${branch.parentChapter.chapterNumber} 章之后`
    : "续写分支";

  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={`/story/${storyId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors min-w-0"
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="truncate max-w-[12rem] sm:max-w-xs">{branch.story.title}</span>
          </Link>
          <Badge className="bg-accent/15 text-accent border-accent/30 gap-1 shrink-0">
            <GitBranch className="size-3" />
            读者续写分支
          </Badge>
        </div>

        <header className="space-y-3 mb-6">
          <p className="text-sm text-muted-foreground">{forkLabel}</p>
          {branch.title && (
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
              {branch.title}
            </h1>
          )}
          {isCanonized && (
            <Badge className="bg-success/15 text-success border-success/30 gap-1">
              <Check className="size-3" />
              已被作者采纳为正章
            </Badge>
          )}
          <div className="flex items-center gap-2">
            <Link
              href={`/users/${branch.proposer.username}`}
              className="flex items-center gap-2 hover:text-primary transition-colors"
            >
              <Avatar className="size-7">
                <AvatarImage src={branch.proposer.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs bg-secondary">
                  {branch.proposer.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{proposerName} 的脑洞</span>
            </Link>
            <span className="text-xs text-muted-foreground">
              · {branch.wordCount.toLocaleString()} 字
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-accent/40 pl-3">
            续写方向：{branch.direction}
          </p>
        </header>

        <Separator className="mb-8" />

        <div
          className="font-prose text-foreground/90 whitespace-pre-wrap"
          style={{ fontSize: "1.075rem", lineHeight: 1.85 }}
        >
          {branch.content}
        </div>

        <Separator className="my-10" />

        <div className="flex items-center justify-between gap-3">
          <BranchPageActions
            branchId={branch.id}
            initialLikeCount={branch._count.likes}
            initialLiked={likedByMe}
            isLoggedIn={currentUserId !== null}
            isOwner={isOwner}
            isCanonized={isCanonized}
          />
          <Link
            href={`/story/${storyId}`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            返回作品页
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          这是读者贡献的「可能的走向」，由 AI 基于原作风格续写，不属于原作正文。
        </p>
      </article>
    </div>
  );
}
