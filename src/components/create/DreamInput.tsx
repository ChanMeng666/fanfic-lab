"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const QUICK_TAGS = [
  "砂金×星期日",
  "丹恒×景元",
  "现代AU",
  "虐转甜HE",
  "ABO设定",
  "豆花甜饼",
];

interface DreamInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export function DreamInput({ onSubmit, disabled }: DreamInputProps) {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
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
