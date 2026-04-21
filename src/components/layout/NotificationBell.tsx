"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useUser } from "@stackframe/stack";
import { Bell, Heart, MessageSquare, UserPlus, Reply, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from "@/lib/actions/notification";

type NotificationItem = Awaited<ReturnType<typeof getNotifications>>[number];

const POLL_INTERVAL_MS = 60_000;
const PEEK_LIMIT = 8;

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

function notificationLabel(n: NotificationItem): { icon: React.ReactNode; verb: string; href: string } {
  const p = n.payload;
  switch (n.type) {
    case "story_like":
      return {
        icon: <Heart className="size-3.5 text-accent fill-current" />,
        verb: `点赞了你的《${p.storyTitle}》`,
        href: `/story/${p.storyId}`,
      };
    case "comment":
      return {
        icon: <MessageSquare className="size-3.5 text-primary" />,
        verb: `评论了你的《${p.storyTitle}》`,
        href: `/story/${p.storyId}#comments`,
      };
    case "reply":
      return {
        icon: <Reply className="size-3.5 text-primary" />,
        verb: `回复了你在《${p.storyTitle}》的评论`,
        href: `/story/${p.storyId}#comments`,
      };
    case "comment_like":
      return {
        icon: <Heart className="size-3.5 text-accent fill-current" />,
        verb: `点赞了你在《${p.storyTitle}》的评论`,
        href: `/story/${p.storyId}#comments`,
      };
    case "follow":
      return {
        icon: <UserPlus className="size-3.5 text-primary" />,
        verb: `关注了你`,
        href: `/users/${p.actorUsername}`,
      };
    default:
      return {
        icon: <Sparkles className="size-3.5 text-muted-foreground" />,
        verb: "有新动态",
        href: "/notifications",
      };
  }
}

export function NotificationBell() {
  const user = useUser();
  const isLoggedIn = !!user;

  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [, startMarkAll] = useTransition();

  // Initial fetch + interval poll. Skip entirely when logged out.
  useEffect(() => {
    if (!isLoggedIn) {
      setUnread(0);
      setItems([]);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    function pollCount() {
      getUnreadNotificationCount().then((n) => {
        if (!cancelled) setUnread(n);
      }).catch(() => {});
    }
    pollCount();
    timer = setInterval(pollCount, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [isLoggedIn]);

  async function loadPeek() {
    try {
      const data = await getNotifications({ limit: PEEK_LIMIT });
      setItems(data);
    } catch {
      // silent
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) loadPeek();
  }

  function handleMarkAll() {
    startMarkAll(async () => {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      setUnread(0);
    });
  }

  if (!isLoggedIn) return null;

  const badge = unread > 99 ? "99+" : String(unread);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-full"
          aria-label={unread > 0 ? `${unread} 条未读通知` : "通知"}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium">
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-medium">通知</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs text-primary hover:underline"
            >
              全部标为已读
            </button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              暂无通知
            </p>
          ) : (
            <ul>
              {items.map((n) => {
                const { icon, verb, href } = notificationLabel(n);
                const unreadDot = !n.readAt;
                return (
                  <li key={n.id}>
                    <Link
                      href={href}
                      className="flex gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                      onClick={() => setOpen(false)}
                    >
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={n.payload.actorAvatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs bg-secondary">
                          {n.payload.actorUsername.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">
                          <span className="font-medium">{n.payload.actorName}</span>{" "}
                          <span className="text-muted-foreground">{verb}</span>
                        </p>
                        {n.payload.snippet && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            “{n.payload.snippet}”
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          {icon}
                          <span>{relativeTime(n.createdAt)}</span>
                        </div>
                      </div>
                      {unreadDot && (
                        <span className="size-2 rounded-full bg-primary mt-2 shrink-0" aria-label="未读" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-3 py-2 border-t border-border">
          <Link
            href="/notifications"
            className="text-sm text-primary hover:underline block text-center"
            onClick={() => setOpen(false)}
          >
            查看全部
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
