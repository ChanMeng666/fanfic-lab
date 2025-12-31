"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoryCard, TagFilter, FandomTabs } from "@/components/feed";
import type { StoryCardData } from "@/components/feed";

// Sample data for demonstration
const SAMPLE_STORIES: StoryCardData[] = [
  {
    id: "1",
    title: "The Stars Between Us",
    summary: "When Harry discovers an ancient spell that allows him to communicate across dimensions, he finds himself connected to a version of Draco who made very different choices. A story about forgiveness, second chances, and the paths not taken.",
    fandom: "Harry Potter",
    ships: ["Drarry"],
    tags: ["Slow Burn", "Alternate Universe", "Angst", "Hurt/Comfort", "Post-War"],
    rating: "TEEN",
    status: "PUBLISHED",
    wordCount: 45000,
    chapterCount: 12,
    likes: 1234,
    comments: 89,
    author: { id: "a1", username: "stargazer_writes" },
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Coffee & Confessions",
    summary: "Bucky works at a coffee shop. Steve is his most frustrating customer. A modern AU where everyone deserves happiness and good coffee.",
    fandom: "Marvel",
    ships: ["Stucky"],
    tags: ["Fluff", "AU - Coffee Shop", "Modern AU", "Getting Together"],
    rating: "GENERAL",
    status: "COMPLETE",
    wordCount: 28000,
    chapterCount: 8,
    likes: 892,
    comments: 56,
    author: { id: "a2", username: "shield_writer" },
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    title: "Seasons of Love",
    summary: "Four seasons, four moments, four chances for Taehyung and Jungkook to realize what's been in front of them all along.",
    fandom: "BTS",
    ships: ["Taekook"],
    tags: ["Fluff", "Mutual Pining", "Friends to Lovers", "One Shot Collection"],
    rating: "TEEN",
    status: "COMPLETE",
    wordCount: 15000,
    chapterCount: 4,
    likes: 2341,
    comments: 178,
    author: { id: "a3", username: "purple_army_writer" },
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export default function FeedPage() {
  const [selectedFandom, setSelectedFandom] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedRating, setSelectedRating] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState("recent");

  // Filter stories based on selection
  const filteredStories = SAMPLE_STORIES.filter((story) => {
    if (selectedFandom && story.fandom !== selectedFandom) return false;
    if (selectedRating && story.rating !== selectedRating) return false;
    if (selectedStatus && story.status !== selectedStatus) return false;
    if (
      selectedTags.length > 0 &&
      !selectedTags.some((tag) => story.tags.includes(tag))
    )
      return false;
    return true;
  });

  // Sort stories
  const sortedStories = [...filteredStories].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return b.likes - a.likes;
      case "comments":
        return b.comments - a.comments;
      case "words":
        return b.wordCount - a.wordCount;
      default:
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              FanFic Lab
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/editor">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                Start Writing
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Fandom Tabs */}
        <div className="mb-6">
          <FandomTabs
            selectedFandom={selectedFandom}
            onFandomChange={setSelectedFandom}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <aside className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>🔍</span>
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TagFilter
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  selectedRating={selectedRating}
                  onRatingChange={setSelectedRating}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                />
              </CardContent>
            </Card>
          </aside>

          {/* Main Content - Stories */}
          <div className="lg:col-span-3">
            {/* Sort & Results Count */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">
                  {sortedStories.length} stories
                </span>
                {selectedFandom && (
                  <Badge variant="secondary">{selectedFandom}</Badge>
                )}
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="comments">Most Comments</SelectItem>
                  <SelectItem value="words">Longest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Story Grid */}
            {sortedStories.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {sortedStories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold mb-2">No stories found</h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your filters or explore a different fandom
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFandom(null);
                    setSelectedTags([]);
                    setSelectedRating(undefined);
                    setSelectedStatus(undefined);
                  }}
                >
                  Clear All Filters
                </Button>
              </Card>
            )}

            {/* Load More */}
            {sortedStories.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg">
                  Load More Stories
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
