import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Trophy, Heart, MessageSquare, Eye, BookOpen, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getTrendingStories, type TrendingWindow } from "@/lib/actions/trending";

export const metadata: Metadata = {
  title: "热门排行榜",
  description: "FanFic Lab 社区最受欢迎的同人作品排行。",
};

interface TrendingPageProps {
  searchParams: Promise<{ window?: string }>;
}

const WINDOWS: { value: TrendingWindow; label: string }[] = [
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "all", label: "全部" },
];

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

export default async function TrendingPage({ searchParams }: TrendingPageProps) {
  const { window: windowParam } = await searchParams;
  const window: TrendingWindow =
    windowParam === "week" || windowParam === "month" ? windowParam : "all";

  const stories = await getTrendingStories(window, 30);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6">
          <h1 className="flex items-center gap-2.5 font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            <span className="flex items-center justify-center size-10 rounded-xl bg-accent/15 text-accent">
              <Trophy className="size-6" />
            </span>
            热门排行榜
          </h1>
          <p className="text-muted-foreground">
            按点赞、评论、阅读综合热度排序，发现社区最受欢迎的作品。
          </p>
        </header>

        {/* Window tabs */}
        <div className="mb-6 inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {WINDOWS.map((w) => {
            const active = w.value === window;
            return (
              <Link
                key={w.value}
                href={w.value === "all" ? "/trending" : `/trending?window=${w.value}`}
                scroll={false}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {w.label}
              </Link>
            );
          })}
        </div>

        {stories.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
              <Flame className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">该时段还没有上榜作品</h3>
            <p className="text-muted-foreground">
              换个时间范围，或去「发现」看看最新作品。
            </p>
          </Card>
        ) : (
          <ol className="space-y-2">
            {stories.map((s, i) => {
              const rank = i + 1;
              const topThree = rank <= 3;
              return (
                <li key={s.id}>
                  <Card variant="story" className="overflow-hidden">
                    <Link
                      href={`/story/${s.id}`}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/40 transition-colors"
                    >
                      {/* Rank badge */}
                      <span
                        className={`flex items-center justify-center size-9 shrink-0 rounded-full font-display text-base font-bold tabular-nums ${
                          topThree
                            ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {rank}
                      </span>

                      {/* Cover thumbnail (optional) */}
                      {s.coverImageUrl ? (
                        <div className="relative size-14 shrink-0 rounded-lg overflow-hidden hidden sm:block">
                          <Image
                            src={s.coverImageUrl}
                            alt=""
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="hidden sm:flex items-center justify-center size-14 shrink-0 rounded-lg bg-surface">
                          <BookOpen className="size-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Title + meta */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground line-clamp-1">{s.title}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="truncate">{s.author.displayName || s.author.username}</span>
                          <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                            {s.fandom}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="size-3.5" />
                            {fmt(s.likeCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="size-3.5" />
                            {fmt(s.commentCount)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="size-3.5" />
                            {fmt(s.viewCount)}
                          </span>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 text-accent font-display text-lg font-bold tabular-nums">
                          <Flame className="size-4" />
                          {fmt(s.score)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">热度</div>
                      </div>
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
