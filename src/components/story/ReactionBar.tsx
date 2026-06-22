"use client";

import { useState } from "react";
import { Droplets, Flame, Lightbulb, Candy, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { setReaction, type ReactionSummary } from "@/lib/actions/reaction";

type RType = "TEARS" | "FIRE" | "MIND_BLOWN" | "SWEET";

const REACTIONS: { type: RType; label: string; Icon: LucideIcon }[] = [
  { type: "TEARS", label: "催泪", Icon: Droplets },
  { type: "FIRE", label: "带感", Icon: Flame },
  { type: "MIND_BLOWN", label: "脑洞", Icon: Lightbulb },
  { type: "SWEET", label: "甜", Icon: Candy },
];

interface ReactionBarProps {
  storyId: string;
  initial: ReactionSummary;
  isLoggedIn: boolean;
}

export function ReactionBar({ storyId, initial, isLoggedIn }: ReactionBarProps) {
  const [counts, setCounts] = useState(initial.counts);
  const [mine, setMine] = useState<RType | null>(initial.myReaction);
  const [busy, setBusy] = useState(false);

  async function handle(type: RType) {
    if (!isLoggedIn) {
      toast.error("请先登录后再表达感受");
      return;
    }
    if (busy) return;
    setBusy(true);

    const prevMine = mine;
    const prevCounts = counts;
    const next = { ...counts };
    let nextMine: RType | null;
    if (prevMine === type) {
      next[type] = Math.max(0, next[type] - 1);
      nextMine = null;
    } else {
      if (prevMine) next[prevMine] = Math.max(0, next[prevMine] - 1);
      next[type] = next[type] + 1;
      nextMine = type;
    }
    setCounts(next);
    setMine(nextMine);

    try {
      const res = await setReaction(storyId, type);
      setMine(res.myReaction as RType | null);
    } catch (err) {
      setCounts(prevCounts);
      setMine(prevMine);
      toast.error(formatError(err, "操作失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground mr-1">读后感：</span>
      {REACTIONS.map(({ type, label, Icon }) => {
        const active = mine === type;
        const count = counts[type];
        return (
          <button
            key={type}
            type="button"
            onClick={() => handle(type)}
            disabled={busy}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-sm transition-colors disabled:opacity-60 ${
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground hover:text-foreground hover:border-accent/40"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
