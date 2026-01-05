"use client";

import { useState, useMemo } from "react";
import {
  Library,
  Search,
  Tv,
  Gamepad2,
  BookOpen,
  Film,
  Music,
  MoreHorizontal,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  type SourceType,
  POPULAR_SOURCES,
} from "@/lib/types/agent-state";

interface SourceSelectorProps {
  onComplete: (data: { sourceType: SourceType; sourceName: string }) => void;
}

interface CategoryConfig {
  id: SourceType | "all";
  label: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "all", label: "All", icon: Library },
  { id: "anime", label: "Anime", icon: Tv },
  { id: "manga", label: "Manga", icon: BookOpen },
  { id: "game", label: "Games", icon: Gamepad2 },
  { id: "novel", label: "Novels", icon: BookOpen },
  { id: "tv", label: "TV Shows", icon: Tv },
  { id: "movie", label: "Movies", icon: Film },
  { id: "kpop", label: "K-Pop", icon: Music },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

const SOURCE_ICONS: Record<SourceType, React.ElementType> = {
  anime: Tv,
  manga: BookOpen,
  game: Gamepad2,
  novel: BookOpen,
  tv: Tv,
  movie: Film,
  kpop: Music,
  other: Library,
};

export function SourceSelector({ onComplete }: SourceSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SourceType | "all">("all");
  const [customSource, setCustomSource] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  const filteredSources = useMemo(() => {
    return POPULAR_SOURCES.filter((source) => {
      const matchesSearch = source.name.toLowerCase().includes(search.toLowerCase()) ||
        source.displayName.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || source.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const handleSourceSelect = (sourceName: string, sourceType: SourceType) => {
    setSelectedSource(sourceName);
    // Small delay to show selection before proceeding
    setTimeout(() => {
      onComplete({ sourceType, sourceName });
    }, 150);
  };

  const handleCustomSubmit = () => {
    if (customSource.trim()) {
      // For custom sources, default to "other" type
      onComplete({
        sourceType: selectedCategory === "all" ? "other" : selectedCategory,
        sourceName: customSource.trim(),
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6 animate-fade-slide-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <Library className="size-8" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Choose Your Source
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Select the anime, game, novel, or other media that inspires your fanfiction
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={(v) => setSelectedCategory(v as SourceType | "all")}
        className="w-full"
      >
        <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1.5 rounded-xl">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm data-[state=active]:bg-background"
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for a fandom..."
            className="pl-9 h-11 bg-background"
          />
        </div>

        {/* Sources Grid */}
        <TabsContent value={selectedCategory} className="mt-4">
          <ScrollArea className="h-[320px] rounded-xl border border-border bg-background/50 p-4">
            {filteredSources.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredSources.map((source) => {
                  const Icon = SOURCE_ICONS[source.category];
                  const isSelected = selectedSource === source.name;

                  return (
                    <button
                      key={source.name}
                      onClick={() => handleSourceSelect(source.name, source.category)}
                      className={cn(
                        "flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all hover-lift",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border bg-surface hover:border-primary/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center size-10 rounded-lg",
                          isSelected
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground line-clamp-1">
                          {source.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {source.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Sparkles className="size-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No fandoms found. Try a different search or add a custom source below.
                </p>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Custom Source Input */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground mb-3">
          Can&apos;t find your fandom? Enter it manually:
        </p>
        <div className="flex gap-2">
          <Input
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            placeholder="Enter fandom name (e.g., 'Genshin Impact', 'Naruto')"
            className="flex-1 h-11"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCustomSubmit();
              }
            }}
          />
          <Button
            onClick={handleCustomSubmit}
            disabled={!customSource.trim()}
            className="h-11 gap-2"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          This will help our AI understand the characters and world of your story
        </p>
      </div>
    </div>
  );
}
