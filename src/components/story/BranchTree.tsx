"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Heart,
  Check,
  ChevronDown,
  Trash2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ProposeBranchDialog } from "./ProposeBranchDialog";
import {
  toggleBranchLike,
  canonizeBranch,
  deleteBranch,
  type BranchTreeItem,
} from "@/lib/actions/branch";

interface ChapterMeta {
  id: string;
  chapterNumber: number;
  title: string | null;
}

interface BranchTreeProps {
  storyId: string;
  chapters: ChapterMeta[];
  branches: BranchTreeItem[];
  currentUserId: string | null;
  isOwner: boolean;
  allowBranching: boolean;
  isLoggedIn: boolean;
}

export function BranchTree({
  storyId,
  chapters,
  branches: initialBranches,
  currentUserId,
  isOwner,
  allowBranching,
  isLoggedIn,
}: BranchTreeProps) {
  const router = useRouter();
  const [branches, setBranches] = useState(initialBranches);
  const [dialog, setDialog] = useState<{
    open: boolean;
    chapterId: string;
    chapterNumber: number;
  }>({ open: false, chapterId: "", chapterNumber: 0 });

  const chapterById = useMemo(() => {
    const m = new Map<string, ChapterMeta>();
    chapters.forEach((c) => m.set(c.id, c));
    return m;
  }, [chapters]);

  // Group visible branches by fork chapter, ordered by chapter number.
  const groups = useMemo(() => {
    const byChapter = new Map<string, BranchTreeItem[]>();
    for (const b of branches) {
      const key = b.parentChapterId ?? "";
      if (!byChapter.has(key)) byChapter.set(key, []);
      byChapter.get(key)!.push(b);
    }
    return Array.from(byChapter.entries())
      .map(([chapterId, items]) => ({
        chapter: chapterById.get(chapterId),
        items,
      }))
      .filter((g) => g.chapter)
      .sort((a, b) => a.chapter!.chapterNumber - b.chapter!.chapterNumber);
  }, [branches, chapterById]);

  const lastChapter = chapters[chapters.length - 1];

  function openPropose(chapter: ChapterMeta) {
    setDialog({ open: true, chapterId: chapter.id, chapterNumber: chapter.chapterNumber });
  }

  async function handleLike(branchId: string) {
    const target = branches.find((b) => b.id === branchId);
    if (!target) return;
    const wasLiked = target.likedByMe;
    // optimistic
    setBranches((prev) =>
      prev.map((b) =>
        b.id === branchId
          ? { ...b, likedByMe: !wasLiked, likeCount: b.likeCount + (wasLiked ? -1 : 1) }
          : b
      )
    );
    try {
      const res = await toggleBranchLike(branchId);
      setBranches((prev) =>
        prev.map((b) =>
          b.id === branchId ? { ...b, likedByMe: res.liked, likeCount: res.count } : b
        )
      );
    } catch (err) {
      // rollback
      setBranches((prev) =>
        prev.map((b) =>
          b.id === branchId
            ? { ...b, likedByMe: wasLiked, likeCount: b.likeCount + (wasLiked ? 1 : -1) }
            : b
        )
      );
      toast.error(formatError(err, "操作失败"));
    }
  }

  async function handleCanonize(branchId: string) {
    try {
      const res = await canonizeBranch(branchId);
      toast.success(`已采纳为第 ${res.chapterNumber} 章`);
      router.refresh();
    } catch (err) {
      toast.error(formatError(err, "采纳失败"));
    }
  }

  async function handleDelete(branchId: string) {
    try {
      await deleteBranch(branchId);
      setBranches((prev) => prev.filter((b) => b.id !== branchId));
      toast.success("已删除分支");
    } catch (err) {
      toast.error(formatError(err, "删除失败"));
    }
  }

  const totalActive = branches.filter((b) => b.status === "ACTIVE").length;

  return (
    <section className="rounded-2xl border border-accent/30 bg-ai-surface ai-glow p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2.5 font-display text-lg sm:text-xl text-foreground">
          <span className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
            <GitBranch className="size-4" />
          </span>
          读者续写的可能性
          {totalActive > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalActive}
            </Badge>
          )}
        </h2>
        {isLoggedIn && allowBranching && lastChapter && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => openPropose(lastChapter)}>
            <Sparkles className="size-3.5" />
            我来续写
          </Button>
        )}
      </div>

      {!allowBranching ? (
        <p className="text-sm text-muted-foreground">作者已关闭本作品的读者续写。</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          还没有读者续写。
          {isLoggedIn
            ? "成为第一个写下「如果是这样呢？」的人吧。"
            : " 登录后即可贡献你的脑洞分支。"}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map(({ chapter, items }) => (
            <Collapsible key={chapter!.id} defaultOpen className="rounded-xl border border-border bg-surface/60">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left group">
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <BookOpen className="size-3.5 text-muted-foreground" />
                  第 {chapter!.chapterNumber} 章之后
                  <Badge variant="outline" className="text-xs font-normal">
                    {items.length} 个续写
                  </Badge>
                </span>
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 space-y-3">
                {items.map((b) => {
                  const proposerName = b.proposer.displayName || b.proposer.username;
                  const isCanonized = b.status === "CANONIZED";
                  const canDelete =
                    !isCanonized && (isOwner || b.proposer.id === currentUserId);
                  return (
                    <div
                      key={b.id}
                      className="rounded-lg border border-border bg-background p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/users/${b.proposer.username}`}
                          className="flex items-center gap-2 min-w-0 hover:text-primary transition-colors"
                        >
                          <Avatar className="size-6 shrink-0">
                            <AvatarImage src={b.proposer.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[10px] bg-secondary">
                              {b.proposer.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">
                            {proposerName}
                          </span>
                        </Link>
                        {isCanonized && (
                          <Badge className="bg-success/15 text-success border-success/30 text-xs gap-1">
                            <Check className="size-3" />
                            已采纳为正章
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-foreground/90">
                        <span className="text-muted-foreground">续写方向：</span>
                        {b.direction}
                      </p>

                      {b.title && (
                        <p className="font-display text-sm text-accent">「{b.title}」</p>
                      )}
                      <p className="font-prose text-sm text-muted-foreground line-clamp-3">
                        {b.preview}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant={b.likedByMe ? "default" : "outline"}
                            size="sm"
                            className="gap-1.5 h-7"
                            onClick={() => handleLike(b.id)}
                            disabled={!isLoggedIn}
                            aria-label={b.likedByMe ? "取消点赞" : "点赞"}
                          >
                            <Heart className={`size-3.5 ${b.likedByMe ? "fill-current" : ""}`} />
                            {b.likeCount}
                          </Button>
                          <Link href={`/story/${storyId}/branch/${b.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1.5 h-7">
                              <BookOpen className="size-3.5" />
                              展开阅读
                            </Button>
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {b.wordCount.toLocaleString()} 字
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isOwner && !isCanonized && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 h-7 border-accent/40 text-accent"
                              onClick={() => handleCanonize(b.id)}
                            >
                              <Check className="size-3.5" />
                              采纳为正章
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(b.id)}
                              aria-label="删除分支"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoggedIn && allowBranching && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 w-full text-muted-foreground"
                    onClick={() => openPropose(chapter!)}
                  >
                    <GitBranch className="size-3.5" />
                    也从第 {chapter!.chapterNumber} 章之后续写
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {dialog.chapterId && (
        <ProposeBranchDialog
          storyId={storyId}
          parentChapterId={dialog.chapterId}
          parentChapterNumber={dialog.chapterNumber}
          open={dialog.open}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        />
      )}
    </section>
  );
}
