"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, getComments } from "@/lib/actions/story";

type CommentFromServer = Awaited<ReturnType<typeof getComments>>[number];

function relativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return d.toLocaleDateString("zh-CN");
}

interface CommentsSectionProps {
  storyId: string;
  isLoggedIn: boolean;
}

export function CommentsSection({ storyId, isLoggedIn }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentFromServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [submitting, startSubmit] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getComments(storyId)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("加载评论失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    if (!isLoggedIn) {
      toast.error("请先登录后再评论");
      return;
    }

    startSubmit(async () => {
      try {
        const created = await addComment(storyId, content);
        setComments((prev) => [{ ...created, replies: [] }, ...prev]);
        setDraft("");
        toast.success("已发表评论");
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unauthorized")) {
          toast.error("请先登录后再评论");
        } else {
          toast.error("发表失败，请重试");
        }
      }
    });
  }

  return (
    <section id="comments" className="space-y-6 scroll-mt-24">
      <header className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
          <MessageSquare className="size-4" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          评论 {comments.length > 0 ? `(${comments.length})` : ""}
        </h2>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={isLoggedIn ? "写下你的想法…" : "登录后即可参与评论"}
          rows={3}
          disabled={!isLoggedIn || submitting}
          className="resize-none"
          aria-label="评论内容"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isLoggedIn ? "公开评论，请友善交流" : "需要先登录才能发表评论"}
          </p>
          <Button
            type="submit"
            size="sm"
            disabled={!draft.trim() || submitting || !isLoggedIn}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            {submitting ? "发表中…" : "发表评论"}
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          加载评论中…
        </p>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <div className="flex items-center justify-center size-12 rounded-xl bg-muted mx-auto mb-3">
            <MessageSquare className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">还没有评论，来抢沙发吧</p>
        </div>
      ) : (
        <ul className="space-y-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Link
                href={`/users/${c.user.username}`}
                className="shrink-0"
                aria-label={c.user.displayName || c.user.username}
              >
                <Avatar className="size-9">
                  <AvatarImage src={c.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {c.user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <Link
                    href={`/users/${c.user.username}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {c.user.displayName || c.user.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
                  {c.content}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
