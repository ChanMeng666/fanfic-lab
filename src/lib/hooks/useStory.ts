"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getStory,
  getMyStories,
  getFeedStories,
  createStory,
  updateStory,
  publishStory,
  toggleLike,
} from "@/lib/actions/story";
import { Rating, StoryStatus } from "@prisma/client";

// Types
interface Story {
  id: string;
  title: string;
  summary: string | null;
  fandom: string;
  ships: string[];
  tags: string[];
  rating: Rating;
  status: StoryStatus;
  isComplete: boolean;
  allowBranching: boolean;
  wordCount: number;
  viewCount: number;
  coverImageUrl: string | null;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  chapters: Chapter[];
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  _count: {
    likes: number;
    comments: number;
    chapters?: number;
  };
}

interface Chapter {
  id: string;
  title: string | null;
  content: string;
  chapterNumber: number;
  wordCount: number;
  authorNotes: string | null;
}

interface UseStoryResult {
  story: Story | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  update: (data: Partial<Story>) => Promise<void>;
  publish: () => Promise<void>;
  like: () => Promise<boolean>;
}

interface UseStoriesResult {
  stories: Story[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

interface FeedFilters {
  fandom?: string;
  tags?: string[];
  rating?: Rating;
  status?: StoryStatus;
  search?: string;
  sortBy?: "recent" | "popular" | "comments" | "words";
}

/**
 * Hook for fetching and managing a single story
 */
export function useStory(storyId: string | null): UseStoryResult {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStory = useCallback(async () => {
    if (!storyId) {
      setStory(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getStory(storyId);
      setStory(data as Story);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch story");
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const update = useCallback(
    async (data: Partial<Story>) => {
      if (!storyId) return;

      try {
        await updateStory({
          id: storyId,
          title: data.title,
          summary: data.summary || undefined,
          fandom: data.fandom,
          ships: data.ships,
          tags: data.tags,
          rating: data.rating,
          status: data.status,
          coverImageUrl: data.coverImageUrl || undefined,
        });
        // Refetch to get the full story with _count
        await fetchStory();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update story");
        throw err;
      }
    },
    [storyId, fetchStory]
  );

  const publish = useCallback(async () => {
    if (!storyId) return;

    try {
      await publishStory(storyId);
      await fetchStory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish story");
      throw err;
    }
  }, [storyId, fetchStory]);

  const like = useCallback(async () => {
    if (!storyId) return false;

    try {
      const result = await toggleLike(storyId);
      await fetchStory();
      return result.liked;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to like story");
      return false;
    }
  }, [storyId, fetchStory]);

  return {
    story,
    loading,
    error,
    refetch: fetchStory,
    update,
    publish,
    like,
  };
}

/**
 * Hook for fetching user's own stories
 */
export function useMyStories(): UseStoriesResult {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getMyStories();
      setStories(data as Story[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return {
    stories,
    loading,
    error,
    refetch: fetchStories,
    hasMore: false,
    loadMore: async () => {},
  };
}

/**
 * Hook for fetching feed stories with pagination
 */
export function useFeedStories(
  filters?: FeedFilters,
  pageSize: number = 20
): UseStoriesResult {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchStories = useCallback(
    async (reset: boolean = false) => {
      const currentOffset = reset ? 0 : offset;
      setLoading(true);
      setError(null);

      try {
        const data = await getFeedStories({
          ...filters,
          limit: pageSize,
          offset: currentOffset,
        });

        if (reset) {
          setStories(data as Story[]);
          setOffset(pageSize);
        } else {
          setStories((prev) => [...prev, ...(data as Story[])]);
          setOffset((prev) => prev + pageSize);
        }

        setHasMore(data.length === pageSize);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch stories");
      } finally {
        setLoading(false);
      }
    },
    [filters, pageSize, offset]
  );

  const tagsKey = filters?.tags?.join(",");
  useEffect(() => {
    fetchStories(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters?.fandom,
    filters?.rating,
    filters?.status,
    filters?.search,
    filters?.sortBy,
    tagsKey,
  ]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchStories(false);
    }
  }, [loading, hasMore, fetchStories]);

  return {
    stories,
    loading,
    error,
    refetch: () => fetchStories(true),
    hasMore,
    loadMore,
  };
}

/**
 * Hook for creating a new story
 */
export function useCreateStory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: {
      title: string;
      summary?: string;
      fandom: string;
      ships: string[];
      tags: string[];
      rating?: Rating;
      content?: string;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const story = await createStory(data);
        return story;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create story";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    create,
    loading,
    error,
  };
}
