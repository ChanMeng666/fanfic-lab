"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Flame, ArrowRight } from "lucide-react";
import { getTrendingStories, type TrendingStory } from "@/lib/actions/trending";

// 本周精选: a compact editorial strip on the discovery feed surfacing the
// week's hottest stories (reusing the trending engine). Falls back to the
// all-time board when the week is quiet, so it's never empty on a small site.
export function WeeklyPicks() {
  const [picks, setPicks] = useState<TrendingStory[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let rows = await getTrendingStories("week", 6);
        if (rows.length === 0) rows = await getTrendingStories("all", 6);
        if (!cancelled) setPicks(rows);
      } catch {
        if (!cancelled) setPicks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!picks || picks.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-accent/30 bg-ai-surface ai-glow p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 font-display text-base text-foreground">
          <Sparkles className="size-4 text-accent" />
          本周精选
        </h2>
        <Link
          href="/trending"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          完整榜单
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {picks.map((s, i) => (
          <Link
            key={s.id}
            href={`/story/${s.id}`}
            className="shrink-0 w-56 rounded-xl border border-border bg-background p-3 hover:border-accent/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center justify-center size-6 rounded-full bg-accent/15 text-accent text-xs font-bold tabular-nums shrink-0">
                {i + 1}
              </span>
              <span className="flex items-center gap-1 text-xs text-accent tabular-nums">
                <Flame className="size-3" />
                {s.score}
              </span>
            </div>
            <p className="font-medium text-sm text-foreground line-clamp-1">{s.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {s.author.displayName || s.author.username} · {s.fandom}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
