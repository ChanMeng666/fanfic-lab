"use client";

import { useState, useMemo } from "react";
import { Search, BookOpen, X, Loader2, PenLine } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StoryCard, FilterBar, StoryCardSkeleton } from "@/components/feed";
import type { StoryCardData } from "@/components/feed";
import { useFeedStories, useInfiniteScroll, useDebounce } from "@/lib/hooks";

const PAGE_SIZE = 8;

export default function FeedPage() {
  const [selectedFandom, setSelectedFandom] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "comments" | "words">("recent");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Build filters object
  const filters = useMemo(
    () => ({
      fandom: selectedFandom || undefined,
      status: selectedStatus as "PUBLISHED" | undefined,
      search: debouncedSearch || undefined,
      sortBy,
    }),
    [selectedFandom, selectedStatus, debouncedSearch, sortBy]
  );

  // Fetch real data from database
  const { stories, loading, error, hasMore, loadMore } = useFeedStories(filters, PAGE_SIZE);

  // Infinite scroll
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loading,
    threshold: 300,
  });

  // Transform database stories to StoryCardData format
  const displayedStories: StoryCardData[] = useMemo(
    () =>
      stories.map((story) => ({
        id: story.id,
        title: story.title,
        summary: story.summary || "",
        fandom: story.fandom,
        ships: story.ships,
        tags: story.tags,
        rating: story.rating as "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT",
        status: story.status === "PUBLISHED" ? "PUBLISHED" : story.status === "ARCHIVED" ? "COMPLETE" : "DRAFT",
        wordCount: story.wordCount,
        chapterCount: story._count?.chapters || 0,
        likes: story._count?.likes || 0,
        comments: story._count?.comments || 0,
        coverUrl: story.coverImageUrl || undefined,
        author: {
          id: story.author.id,
          username: story.author.username,
          avatarUrl: story.author.avatarUrl || undefined,
        },
        updatedAt: story.updatedAt.toISOString(),
      })),
    [stories]
  );

  const hasActiveFilters = selectedFandom || selectedStatus || searchQuery;

  const clearAllFilters = () => {
    setSelectedFandom(null);
    setSelectedStatus(undefined);
    setSearchQuery("");
  };

  // Initial loading state (no stories yet)
  const isInitialLoading = loading && stories.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Explore Stories
          </h1>
          <p className="text-muted-foreground">
            Discover fanfiction from your favorite fandoms
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search stories..."
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

        {/* Filter Bar */}
        <div className="mb-6">
          <FilterBar
            selectedFandom={selectedFandom}
            onFandomChange={setSelectedFandom}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            sortBy={sortBy}
            onSortChange={(sort) => setSortBy(sort as "recent" | "popular" | "comments" | "words")}
            resultCount={displayedStories.length}
          />
        </div>

        {/* Error State */}
        {error && (
          <Card className="p-8 text-center border-destructive/50">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Loading State (Initial) */}
        {isInitialLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Story Grid */}
        {!isInitialLoading && displayedStories.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading indicator for infinite scroll */}
            {loading && stories.length > 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}

            {/* End of list indicator */}
            {!hasMore && stories.length > 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                You&apos;ve reached the end
              </p>
            )}
          </>
        )}

        {/* Empty State */}
        {!isInitialLoading && !error && displayedStories.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
              <BookOpen className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {hasActiveFilters ? "No stories found" : "No stories yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {hasActiveFilters
                ? "Try adjusting your filters or search query, or explore a different fandom"
                : "Be the first to publish a story and share your creativity with the community!"}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/create" className="gap-1.5">
                  <PenLine className="size-4" />
                  Create Your First Story
                </Link>
              </Button>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
