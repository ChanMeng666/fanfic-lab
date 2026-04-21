"use client";

import { useEffect, useState, useTransition } from "react";
import {
  MessageSquare,
  Send,
  Heart,
  MoreHorizontal,
  Pencil,
  Trash2,
  Reply,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addComment,
  getComments,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from "@/lib/actions/story";

type CommentList = Awaited<ReturnType<typeof getComments>>;
type CommentItem = CommentList[number];
type ReplyItem = CommentItem["replies"][number];

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
  currentUserId: string | null;
}

export function CommentsSection({ storyId, currentUserId }: CommentsSectionProps) {
  const isLoggedIn = !!currentUserId;
  const [comments, setComments] = useState<CommentList>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [submitting, startSubmit] = useTransition();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, startReplying] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    getComments(storyId, currentUserId)
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
  }, [storyId, currentUserId]);

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
        setComments((prev) => [
          {
            id: created.id,
            content: created.content,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
            userId: created.userId,
            user: created.user,
            likeCount: 0,
            likedByMe: false,
            replies: [],
          },
          ...prev,
        ]);
        setDraft("");
        toast.success("已发表评论");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "发表失败，请重试");
      }
    });
  }

  function handleReply(parentId: string) {
    const content = replyDraft.trim();
    if (!content || !isLoggedIn) return;

    startReplying(async () => {
      try {
        const created = await addComment(storyId, content, parentId);
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? {
                  ...c,
                  replies: [
                    ...c.replies,
                    {
                      id: created.id,
                      content: created.content,
                      createdAt: created.createdAt,
                      updatedAt: created.updatedAt,
                      userId: created.userId,
                      user: created.user,
                      likeCount: 0,
                      likedByMe: false,
                    },
                  ],
                }
              : c
          )
        );
        setReplyTo(null);
        setReplyDraft("");
        toast.success("回复已发表");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "回复失败，请重试");
      }
    });
  }

  async function handleToggleLike(commentId: string, isReply: boolean, parentId?: string) {
    if (!isLoggedIn) {
      toast.error("请先登录后再点赞");
      return;
    }

    // Optimistic update
    const updateLocal = (delta: number, liked: boolean) => {
      setComments((prev) =>
        prev.map((c) => {
          if (!isReply && c.id === commentId) {
            return { ...c, likeCount: c.likeCount + delta, likedByMe: liked };
          }
          if (isReply && c.id === parentId) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? { ...r, likeCount: r.likeCount + delta, likedByMe: liked }
                  : r
              ),
            };
          }
          return c;
        })
      );
    };

    // Find current state
    let currentLiked = false;
    if (!isReply) {
      const c = comments.find((x) => x.id === commentId);
      currentLiked = c?.likedByMe ?? false;
    } else {
      const parent = comments.find((x) => x.id === parentId);
      currentLiked = parent?.replies.find((r) => r.id === commentId)?.likedByMe ?? false;
    }
    const delta = currentLiked ? -1 : 1;
    updateLocal(delta, !currentLiked);

    try {
      const res = await toggleCommentLike(commentId);
      if (res.liked !== !currentLiked) {
        // Reconcile if server disagreed
        updateLocal(-delta, currentLiked);
      }
    } catch (err) {
      updateLocal(-delta, currentLiked);
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  function startEdit(c: CommentItem | ReplyItem) {
    setEditingId(c.id);
    setEditDraft(c.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function saveEdit(commentId: string, isReply: boolean, parentId?: string) {
    const content = editDraft.trim();
    if (!content) return;
    try {
      await updateComment(commentId, content);
      setComments((prev) =>
        prev.map((c) => {
          if (!isReply && c.id === commentId) {
            return { ...c, content, updatedAt: new Date() };
          }
          if (isReply && c.id === parentId) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, content, updatedAt: new Date() } : r
              ),
            };
          }
          return c;
        })
      );
      cancelEdit();
      toast.success("已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function handleDelete(commentId: string, isReply: boolean, parentId?: string) {
    try {
      await deleteComment(commentId);
      setComments((prev) =>
        isReply
          ? prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) }
                : c
            )
          : prev.filter((c) => c.id !== commentId)
      );
      toast.success("已删除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  }

  function CommentBody({
    c,
    isReply,
    parentId,
  }: {
    c: CommentItem | ReplyItem;
    isReply: boolean;
    parentId?: string;
  }) {
    const isOwner = !!currentUserId && c.userId === currentUserId;
    const isEditing = editingId === c.id;
    const isReplyingHere = !isReply && replyTo === c.id;
    const edited =
      new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 1000;

    return (
      <div className="flex gap-3">
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <Link
                href={`/users/${c.user.username}`}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {c.user.displayName || c.user.username}
              </Link>
              <span className="text-xs text-muted-foreground">
                {relativeTime(c.createdAt)}
                {edited ? "（已编辑）" : ""}
              </span>
            </div>
            {isOwner && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground -mt-1"
                    aria-label="更多操作"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => startEdit(c)} className="gap-2">
                    <Pencil className="size-3.5" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(c.id, isReply, parentId)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2 mt-2">
              <Textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => saveEdit(c.id, isReply, parentId)}
                  disabled={!editDraft.trim()}
                >
                  保存
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
              {c.content}
            </p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1 mt-1.5 -ml-2">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 h-7 px-2 ${c.likedByMe ? "text-accent" : "text-muted-foreground"}`}
                onClick={() => handleToggleLike(c.id, isReply, parentId)}
                aria-label={c.likedByMe ? "取消点赞" : "点赞"}
              >
                <Heart className={`size-3.5 ${c.likedByMe ? "fill-current" : ""}`} />
                {c.likeCount > 0 && c.likeCount}
              </Button>
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-7 px-2 text-muted-foreground"
                  onClick={() => {
                    if (!isLoggedIn) {
                      toast.error("请先登录后再回复");
                      return;
                    }
                    setReplyTo(replyTo === c.id ? null : c.id);
                    setReplyDraft("");
                  }}
                >
                  <Reply className="size-3.5" />
                  回复
                </Button>
              )}
            </div>
          )}

          {isReplyingHere && (
            <div className="space-y-2 mt-3 pl-3 border-l-2 border-border">
              <Textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder={`回复 @${c.user.username}…`}
                rows={2}
                className="resize-none"
                disabled={replying}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleReply(c.id)}
                  disabled={!replyDraft.trim() || replying}
                  className="gap-1.5"
                >
                  <Send className="size-3.5" />
                  {replying ? "发送中…" : "发送"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setReplyTo(null);
                    setReplyDraft("");
                  }}
                  disabled={replying}
                  className="gap-1.5"
                >
                  <X className="size-3.5" />
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
        <p className="text-sm text-muted-foreground py-6 text-center">加载评论中…</p>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
          <div className="flex items-center justify-center size-12 rounded-xl bg-muted mx-auto mb-3">
            <MessageSquare className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">还没有评论，来抢沙发吧</p>
        </div>
      ) : (
        <ul className="space-y-6">
          {comments.map((c) => (
            <li key={c.id}>
              <CommentBody c={c} isReply={false} />
              {c.replies.length > 0 && (
                <ul className="mt-4 ml-12 space-y-4 border-l-2 border-border pl-4">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentBody c={r} isReply parentId={c.id} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
