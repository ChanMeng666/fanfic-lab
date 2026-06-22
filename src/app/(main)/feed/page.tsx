"use client";

import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { Search, BookOpen, X, Loader2, PenLine } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StoryCard, FilterBar, StoryCardSkeleton } from "@/components/feed";
import type { StoryCardData } from "@/components/feed";
import { useFeedStories, useInfiniteScroll, useDebounce } from "@/lib/hooks";
import { toggleLike } from "@/lib/actions/story";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";

const PAGE_SIZE = 8;

type SortOption = "recent" | "popular" | "comments" | "words";

export default function FeedPage() {
  // useSearchParams in FeedPageContent requires a Suspense boundary so the
  // page can be statically prerendered without bailing out.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-4 py-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <StoryCardSkeleton key={i} />
              ))}
            </div>
          </main>
        </div>
      }
    >
      <FeedPageContent />
    </Suspense>
  );
}

function FeedPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedFandom, setSelectedFandom] = useState<string | null>(
    searchParams.get("fandom") || null
  );
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    searchParams.get("status") || undefined
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get("sort") as SortOption) || "recent"
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sync URL on filter change.
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedFandom) params.set("fandom", selectedFandom);
    if (selectedStatus) params.set("status", selectedStatus);
    if (sortBy && sortBy !== "recent") params.set("sort", sortBy);
    if (debouncedSearch) params.set("q", debouncedSearch);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedFandom, selectedStatus, sortBy, debouncedSearch, pathname, router]);

  const filters = useMemo(
    () => ({
      fandom: selectedFandom || undefined,
      status: selectedStatus as "PUBLISHED" | undefined,
      search: debouncedSearch || undefined,
      sortBy,
    }),
    [selectedFandom, selectedStatus, debouncedSearch, sortBy]
  );

  const { stories, loading, error, hasMore, loadMore } = useFeedStories(filters, PAGE_SIZE);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loading,
    threshold: 300,
  });

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
        // Completion (已完结) is now driven by isComplete, independent of
        // visibility. Completed stories stay PUBLISHED and visible in the feed.
        status: story.isComplete
          ? "COMPLETE"
          : story.status === "PUBLISHED"
            ? "PUBLISHED"
            : "DRAFT",
        wordCount: story.wordCount,
        chapterCount: story._count?.chapters || 0,
        likes: story._count?.likes || 0,
        comments: story._count?.comments || 0,
        views: story.viewCount,
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

  const handleLike = useCallback(async (storyId: string) => {
    try {
      await toggleLike(storyId);
    } catch (err) {
      toast.error(formatError(err, "点赞失败"));
    }
  }, []);

  const hasActiveFilters = !!(
    selectedFandom ||
    selectedStatus ||
    searchQuery ||
    sortBy !== "recent"
  );

  const clearAllFilters = () => {
    setSelectedFandom(null);
    setSelectedStatus(undefined);
    setSearchQuery("");
    setSortBy("recent");
  };

  const isInitialLoading = loading && stories.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            发现故事
          </h1>
          <p className="text-muted-foreground">
            浏览社区中其他作者的同人创作
          </p>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索故事…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
            aria-label="搜索故事"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="清除搜索"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="mb-6">
          <FilterBar
            selectedFandom={selectedFandom}
            onFandomChange={setSelectedFandom}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            sortBy={sortBy}
            onSortChange={(sort) => setSortBy(sort as SortOption)}
            resultCount={displayedStories.length}
          />
        </div>

        {error && (
          <Card className="p-8 text-center border-destructive/50" role="alert">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              重试
            </Button>
          </Card>
        )}

        {isInitialLoading && (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-label="加载中"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isInitialLoading && displayedStories.length > 0 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedStories.map((story) => (
                <StoryCard key={story.id} story={story} onLike={() => handleLike(story.id)} />
              ))}
            </div>

            <div ref={sentinelRef} className="h-4" />

            {loading && stories.length > 0 && (
              <div
                className="flex justify-center py-8"
                role="status"
                aria-label="加载更多"
              >
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            )}

            {!hasMore && stories.length > 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                已经看到底啦
              </p>
            )}
          </>
        )}

        {!isInitialLoading && !error && displayedStories.length === 0 && (
          <Card className="p-12 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
              <BookOpen className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {hasActiveFilters ? "没有符合条件的故事" : "暂无故事"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {hasActiveFilters
                ? "试试调整筛选条件或搜索关键词"
                : "成为第一位发布故事的作者，与社区分享你的创意吧！"}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearAllFilters}>
                清除筛选
              </Button>
            ) : (
              <Button asChild>
                <Link href="/create" className="gap-1.5">
                  <PenLine className="size-4" />
                  开始创作
                </Link>
              </Button>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
