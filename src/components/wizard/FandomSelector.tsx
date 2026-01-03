"use client";

import { useState } from "react";
import {
  Library,
  Search,
  Zap,
  Shield,
  Ghost,
  Star,
  Glasses,
  Sword,
  Music,
  Gamepad2,
  Volleyball,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FandomSelectorProps {
  onSelect: (fandom: string) => void;
}

const POPULAR_FANDOMS = [
  { name: "Harry Potter", category: "Books", icon: Zap },
  { name: "Marvel Cinematic Universe", category: "Movies", icon: Shield },
  { name: "BTS", category: "K-Pop", icon: Music },
  { name: "Supernatural", category: "TV", icon: Ghost },
  { name: "Star Wars", category: "Movies", icon: Star },
  { name: "Sherlock", category: "TV", icon: Glasses },
  { name: "My Hero Academia", category: "Anime", icon: Shield },
  { name: "Attack on Titan", category: "Anime", icon: Sword },
  { name: "Stray Kids", category: "K-Pop", icon: Music },
  { name: "The Witcher", category: "Games/TV", icon: Sword },
  { name: "Genshin Impact", category: "Games", icon: Gamepad2 },
  { name: "Haikyuu!!", category: "Anime", icon: Volleyball },
];

const CATEGORIES = ["All", "Books", "Movies", "TV", "Anime", "K-Pop", "Games"];

export function FandomSelector({ onSelect }: FandomSelectorProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customFandom, setCustomFandom] = useState("");

  const filteredFandoms = POPULAR_FANDOMS.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || f.category.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const handleCustomSubmit = () => {
    if (customFandom.trim()) {
      onSelect(customFandom.trim());
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
          <Library className="size-5" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Choose Your Fandom</h3>
          <p className="text-sm text-muted-foreground">Select a universe for your story</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fandoms..."
          className="pl-9 bg-surface"
        />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Fandom Grid */}
      <ScrollArea className="h-[200px]">
        <div className="grid grid-cols-2 gap-2">
          {filteredFandoms.map((fandom) => {
            const Icon = fandom.icon;
            return (
              <Button
                key={fandom.name}
                variant="outline"
                className="h-auto py-3 justify-start gap-2 hover:bg-primary/10 hover:border-primary/30"
                onClick={() => onSelect(fandom.name)}
              >
                <Icon className="size-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium text-sm text-foreground">{fandom.name}</div>
                  <div className="text-xs text-muted-foreground">{fandom.category}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Custom Fandom */}
      <div className="pt-3 border-t border-border/50">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">
          Or enter a custom fandom:
        </label>
        <div className="flex gap-2">
          <Input
            value={customFandom}
            onChange={(e) => setCustomFandom(e.target.value)}
            placeholder="e.g., Percy Jackson, One Direction..."
            className="bg-surface"
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
          />
          <Button
            onClick={handleCustomSubmit}
            disabled={!customFandom.trim()}
            className="gap-1.5"
          >
            <Sparkles className="size-4" />
            Select
          </Button>
        </div>
      </div>
    </div>
  );
}
