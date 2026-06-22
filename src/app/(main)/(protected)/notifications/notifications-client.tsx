"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Heart, MessageSquare, UserPlus, Reply, Sparkles, CheckCheck, GitBranch, Check, AtSign } from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  type getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notification";

type NotificationItem = Awaited<ReturnType<typeof getNotifications>>[number];

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

function notificationLabel(n: NotificationItem) {
  const p = n.payload;
  switch (n.type) {
    case "story_like":
      return {
        icon: <Heart className="size-4 text-accent fill-current" />,
        verb: `点赞了你的《${p.storyTitle}》`,
        href: `/story/${p.storyId}`,
      };
    case "comment":
      return {
        icon: <MessageSquare className="size-4 text-primary" />,
        verb: `评论了你的《${p.storyTitle}》`,
        href: `/story/${p.storyId}#comments`,
      };
    case "reply":
      return {
        icon: <Reply className="size-4 text-primary" />,
        verb: `回复了你在《${p.storyTitle}》的评论`,
        href: `/story/${p.storyId}#comments`,
      };
    case "comment_like":
      return {
        icon: <Heart className="size-4 text-accent fill-current" />,
        verb: `点赞了你在《${p.storyTitle}》的评论`,
        href: `/story/${p.storyId}#comments`,
      };
    case "mention":
      return {
        icon: <AtSign className="size-4 text-primary" />,
        verb: `在《${p.storyTitle}》的评论中提到了你`,
        href: `/story/${p.storyId}#comments`,
      };
    case "follow":
      return {
        icon: <UserPlus className="size-4 text-primary" />,
        verb: `关注了你`,
        href: `/users/${p.actorUsername}`,
      };
    case "branch_proposed":
      return {
        icon: <GitBranch className="size-4 text-accent" />,
        verb: `为你的《${p.storyTitle}》续写了一个分支`,
        href: `/story/${p.storyId}/branch/${p.branchId}`,
      };
    case "branch_like":
      return {
        icon: <Heart className="size-4 text-accent fill-current" />,
        verb: `点赞了你的续写分支`,
        href: `/story/${p.storyId}/branch/${p.branchId}`,
      };
    case "branch_canonized":
      return {
        icon: <Check className="size-4 text-success" />,
        verb: `采纳了你的续写为《${p.storyTitle}》的正章`,
        href: `/story/${p.storyId}`,
      };
    default:
      return {
        icon: <Sparkles className="size-4 text-muted-foreground" />,
        verb: "有新动态",
        href: "/notifications",
      };
  }
}

interface NotificationsListProps {
  initialItems: NotificationItem[];
}

export function NotificationsList({ initialItems }: NotificationsListProps) {
  const [items, setItems] = useState(initialItems);
  const [, startMarkAll] = useTransition();

  const unreadCount = items.filter((n) => !n.readAt).length;

  function handleMarkAll() {
    startMarkAll(async () => {
      try {
        await markAllNotificationsRead();
        setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
        toast.success("已全部标为已读");
      } catch (err) {
        toast.error(formatError(err, "标记已读失败"));
      }
    });
  }

  function handleClick(id: string) {
    // Optimistic mark-as-read on click; doesn't block navigation.
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date() } : n))
    );
    markNotificationRead(id).catch(() => {
      // silent — link still navigates
    });
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{unreadCount} 条未读</span>
          <Button variant="ghost" size="sm" onClick={handleMarkAll} className="gap-1.5">
            <CheckCheck className="size-3.5" />
            全部已读
          </Button>
        </div>
      )}

      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
        {items.map((n) => {
          const { icon, verb, href } = notificationLabel(n);
          const unread = !n.readAt;
          return (
            <li key={n.id}>
              <Link
                href={href}
                onClick={() => handleClick(n.id)}
                className={`flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${unread ? "bg-primary/5" : ""}`}
              >
                <Avatar className="size-10 shrink-0">
                  <AvatarImage src={n.payload.actorAvatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {n.payload.actorUsername.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{n.payload.actorName}</span>{" "}
                    <span className="text-muted-foreground">{verb}</span>
                  </p>
                  {n.payload.snippet && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 italic">
                      “{n.payload.snippet}”
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    {icon}
                    <span>{relativeTime(n.createdAt)}</span>
                  </div>
                </div>
                {unread && (
                  <span className="size-2 rounded-full bg-primary mt-3 shrink-0" aria-label="未读" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
