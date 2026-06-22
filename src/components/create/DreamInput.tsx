"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { LENGTH_OPTIONS, type StoryLength } from "@/lib/billing/pricing";
import { cn } from "@/lib/utils";

const QUICK_TAGS = [
  "砂金×星期日",
  "丹恒×景元",
  "现代AU",
  "虐转甜HE",
  "ABO设定",
  "豆花甜饼",
];

interface DreamInputProps {
  onSubmit: (prompt: string, length: StoryLength) => void;
  disabled?: boolean;
  // Seed text (e.g. from a remix). Remount via `key` to re-seed after it loads.
  initialPrompt?: string;
}

export function DreamInput({ onSubmit, disabled, initialPrompt }: DreamInputProps) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [length, setLength] = useState<StoryLength>("short");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim(), length);
    }
  }

  function handleTagClick(tag: string) {
    const newPrompt = prompt ? `${prompt}，${tag}` : `给我写一篇${tag}`;
    setPrompt(newPrompt);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想看的星穹铁道故事..."
            className="w-full min-h-[120px] p-4 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground font-prose text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              disabled={disabled}
              className="px-3 py-1.5 text-sm rounded-full border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
            >
              {tag}
            </button>
          ))}
        </div>
        {/* Length selector — credit cost is shown up front so the price the
            user sees is exactly what gets charged. */}
        <div className="grid grid-cols-3 gap-2">
          {LENGTH_OPTIONS.map((opt) => {
            const active = length === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLength(opt.value)}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                  "relative flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
                  active
                    ? "border-accent bg-ai-surface ai-glow"
                    : "border-border bg-background hover:bg-secondary"
                )}
              >
                {active && (
                  <Check className="absolute right-2 top-2 size-3.5 text-accent" />
                )}
                <span className="font-display text-base text-foreground">
                  {opt.labelZh}
                </span>
                <span className="text-xs text-muted-foreground">{opt.approxZh}</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    opt.value === "short" ? "text-primary" : "text-accent"
                  )}
                >
                  {opt.value === "short" ? "每日免费起" : `${opt.cost} 积分`}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={!prompt.trim() || disabled}
          className="w-full gap-2"
        >
          <Sparkles className="size-4" />
          开始创作
        </Button>
      </form>
    </div>
  );
}
