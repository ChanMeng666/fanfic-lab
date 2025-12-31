"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FandomSelectorProps {
  onSelect: (fandom: string) => void;
}

const POPULAR_FANDOMS = [
  { name: "Harry Potter", category: "Books", icon: "⚡" },
  { name: "Marvel Cinematic Universe", category: "Movies", icon: "🦸" },
  { name: "BTS", category: "K-Pop", icon: "💜" },
  { name: "Supernatural", category: "TV", icon: "👻" },
  { name: "Star Wars", category: "Movies", icon: "⭐" },
  { name: "Sherlock", category: "TV", icon: "🔍" },
  { name: "My Hero Academia", category: "Anime", icon: "🦸‍♂️" },
  { name: "Attack on Titan", category: "Anime", icon: "⚔️" },
  { name: "Stray Kids", category: "K-Pop", icon: "🐺" },
  { name: "The Witcher", category: "Games/TV", icon: "🐺" },
  { name: "Genshin Impact", category: "Games", icon: "🌟" },
  { name: "Haikyuu!!", category: "Anime", icon: "🏐" },
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
    <Card className="border-2 border-purple-200 bg-purple-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>📚</span>
          Choose Your Fandom
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fandoms..."
          className="bg-white"
        />

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Fandom Grid */}
        <ScrollArea className="h-[200px]">
          <div className="grid grid-cols-2 gap-2">
            {filteredFandoms.map((fandom) => (
              <Button
                key={fandom.name}
                variant="outline"
                className="h-auto py-3 justify-start gap-2 hover:bg-purple-100 hover:border-purple-300"
                onClick={() => onSelect(fandom.name)}
              >
                <span className="text-lg">{fandom.icon}</span>
                <div className="text-left">
                  <div className="font-medium text-sm">{fandom.name}</div>
                  <div className="text-xs text-gray-500">{fandom.category}</div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Custom Fandom */}
        <div className="pt-2 border-t">
          <label className="text-sm font-medium text-gray-600 mb-2 block">
            Or enter a custom fandom:
          </label>
          <div className="flex gap-2">
            <Input
              value={customFandom}
              onChange={(e) => setCustomFandom(e.target.value)}
              placeholder="e.g., Percy Jackson, One Direction..."
              className="bg-white"
              onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            />
            <Button
              onClick={handleCustomSubmit}
              disabled={!customFandom.trim()}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Select
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
