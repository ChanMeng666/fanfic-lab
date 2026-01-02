"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  BookOpen,
  ArrowUpDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StoryCard, TagFilter, FandomTabs } from "@/components/feed";
import type { StoryCardData } from "@/components/feed";
import { cn } from "@/lib/utils";

// Sample data for demonstration
const SAMPLE_STORIES: StoryCardData[] = [
  {
    id: "1",
    title: "The Stars Between Us",
    summary:
      "When Harry discovers an ancient spell that allows him to communicate across dimensions, he finds himself connected to a version of Draco who made very different choices. A story about forgiveness, second chances, and the paths not taken.",
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
    summary:
      "Bucky works at a coffee shop. Steve is his most frustrating customer. A modern AU where everyone deserves happiness and good coffee.",
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
    summary:
      "Four seasons, four moments, four chances for Taehyung and Jungkook to realize what's been in front of them all along.",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
    if (
      searchQuery &&
      !story.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !story.summary.toLowerCase().includes(searchQuery.toLowerCase())
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

  const hasActiveFilters =
    selectedFandom ||
    selectedTags.length > 0 ||
    selectedRating ||
    selectedStatus;

  const clearAllFilters = () => {
    setSelectedFandom(null);
    setSelectedTags([]);
    setSelectedRating(undefined);
    setSelectedStatus(undefined);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Explore Stories
          </h1>
          <p className="text-muted-foreground">
            Discover fanfiction from your favorite fandoms
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search stories by title or summary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Fandom Tabs */}
        <div className="mb-6">
          <FandomTabs
            selectedFandom={selectedFandom}
            onFandomChange={setSelectedFandom}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex items-center justify-center size-8 rounded-xl bg-secondary text-secondary-foreground">
                    <Filter className="size-4" />
                  </div>
                  Filters
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="ml-auto text-xs h-7 px-2"
                    >
                      Clear all
                    </Button>
                  )}
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

          {/* Mobile Filter Button */}
          <div className="lg:hidden mb-4">
            <Button
              variant="outline"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="w-full gap-2"
            >
              <Filter className="size-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-auto">
                  {[
                    selectedFandom ? 1 : 0,
                    selectedTags.length,
                    selectedRating ? 1 : 0,
                    selectedStatus ? 1 : 0,
                  ].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>

            {showMobileFilters && (
              <Card className="mt-4">
                <CardContent className="pt-4">
                  <TagFilter
                    selectedTags={selectedTags}
                    onTagsChange={setSelectedTags}
                    selectedRating={selectedRating}
                    onRatingChange={setSelectedRating}
                    selectedStatus={selectedStatus}
                    onStatusChange={setSelectedStatus}
                  />
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="w-full mt-4"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content - Stories */}
          <div className="lg:col-span-3">
            {/* Sort & Results Count */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {sortedStories.length}{" "}
                  {sortedStories.length === 1 ? "story" : "stories"}
                </span>
                {selectedFandom && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedFandom}
                    <button
                      onClick={() => setSelectedFandom(null)}
                      className="ml-1 hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                )}
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44 gap-2">
                  <ArrowUpDown className="size-4 text-muted-foreground" />
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
              <Card className="p-12 text-center">
                <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                  <BookOpen className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No stories found
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Try adjusting your filters or search query, or explore a
                  different fandom
                </p>
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear All Filters
                </Button>
              </Card>
            )}

            {/* Load More */}
            {sortedStories.length > 0 && (
              <div className="text-center mt-8">
                <Button variant="outline" size="lg" className="min-w-[200px]">
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
