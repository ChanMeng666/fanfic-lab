"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POPULAR_SOURCES, type SourceType } from "@/lib/types/agent-state";

interface FandomInputProps {
  onSubmit: (fandom: string) => void;
  isLoading?: boolean;
}

const CATEGORY_LABELS: Record<SourceType, string> = {
  anime: "Anime",
  manga: "Manga",
  game: "Games",
  novel: "Novels",
  tv: "TV",
  movie: "Movies",
  kpop: "K-Pop",
  other: "Other",
};

export function FandomInput({ onSubmit, isLoading }: FandomInputProps) {
  const [input, setInput] = useState("");

  const filteredSources = useMemo(() => {
    if (!input.trim()) return POPULAR_SOURCES;
    const query = input.toLowerCase();
    return POPULAR_SOURCES.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.displayName.toLowerCase().includes(query)
    );
  }, [input]);

  const groupedSources = useMemo(() => {
    const groups: Partial<Record<SourceType, typeof POPULAR_SOURCES>> = {};
    for (const source of filteredSources) {
      if (!groups[source.category]) groups[source.category] = [];
      groups[source.category]!.push(source);
    }
    return groups;
  }, [filteredSources]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed) onSubmit(trimmed);
  }, [input, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit]
  );

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-slide-in">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-accent/15 text-accent">
            <Sparkles className="size-6" />
          </div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          What would you like to read?
        </h1>
        <p className="text-muted-foreground text-lg">
          Enter a fandom name to get started
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Genshin Impact, Attack on Titan, Harry Potter..."
          className="pl-12 pr-24 h-14 text-lg rounded-2xl border-border bg-surface"
          autoFocus
          disabled={isLoading}
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl gap-1.5"
        >
          {isLoading ? (
            <div className="animate-spin size-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Go
        </Button>
      </div>

      {/* Popular Sources */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          or choose a popular fandom
        </p>
        {Object.entries(groupedSources).map(([category, sources]) => (
          <div key={category} className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category as SourceType]}
            </span>
            <div className="flex flex-wrap gap-2">
              {sources!.map((source) => (
                <Badge
                  key={source.name}
                  variant="outline"
                  className="cursor-pointer px-3 py-1.5 text-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  onClick={() => {
                    setInput(source.name);
                    onSubmit(source.name);
                  }}
                >
                  {source.displayName}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
