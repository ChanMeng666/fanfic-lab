"use client";

import Link from "next/link";
import { Heart, BookOpen, Calendar, User, Tag, MessageSquare, Pencil, Sparkles, Eye, Bookmark, BookmarkCheck, Copy, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toggleLike } from "@/lib/actions/story";
import { toggleBookmark } from "@/lib/actions/bookmark";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { CommentsSection } from "./CommentsSection";
import { ShareButton } from "./ShareButton";
import { ReactionBar } from "./ReactionBar";
import { ReadingProgressTracker } from "./ReadingProgressTracker";
import { AddToCollectionDialog } from "./AddToCollectionDialog";
import { ContinueChapterDialog } from "./ContinueChapterDialog";
import type { ReactionSummary } from "@/lib/actions/reaction";
import { ViewTracker } from "./ViewTracker";
import { ReadingPrefs } from "./ReadingPrefs";
import { ReadingProgressBanner } from "./ReadingProgressBanner";
import { CompletionToggleButton } from "./CompletionToggleButton";
import { ChapterTOC } from "./ChapterTOC";
import {
  ChapterBody,
  CompletionBadge,
  ratingLabels,
  ratingVariants,
  readingMinutes,
  formatCount,
} from "./reader-shared";
import {
  useReadingPrefs,
  useReadingProgress,
  FONT_SIZE_PX,
  LINE_HEIGHT_VALUE,
} from "@/lib/hooks";

interface StoryReaderProps {
  story: {
    id: string;
    title: string;
    summary: string | null;
    fandom: string;
    ships: string[];
    tags: string[];
    rating: string;
    isComplete: boolean;
    wordCount: number;
    viewCount: number;
    publishedAt: Date | null;
    createdAt: Date;
    author: {
      displayName: string | null;
      username: string;
    };
  };
  // Chapter metadata only (no content) — used for the TOC and counts.
  chapters: Array<{
    id: string;
    title: string | null;
    chapterNumber: number;
    wordCount: number;
  }>;
  // Body of the single chapter, only provided when the story has exactly one
  // chapter (rendered inline on the overview to keep one-shots a one-page read).
  firstChapterContent?: string | null;
  initialLikeCount?: number;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  commentCount?: number;
  currentUserId?: string | null;
  isOwner?: boolean;
  // Set when this story is itself a remix of another work (attribution).
  remixedFrom?: { id: string; title: string; authorUsername: string } | null;
  reactions?: ReactionSummary;
  // The reader's last-read chapter number for this story (series-wide resume).
  resumeChapter?: number | null;
}

export function StoryReader({
  story,
  chapters,
  firstChapterContent = null,
  initialLikeCount = 0,
  initialLiked = false,
  initialBookmarked = false,
  commentCount = 0,
  currentUserId = null,
  isOwner = false,
  remixedFrom = null,
  reactions,
  resumeChapter = null,
}: StoryReaderProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liking, setLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);

  const { fontSize, lineHeight } = useReadingPrefs();
  const chapterCount = chapters.length;
  const isSingleChapter = chapterCount === 1;
  // Per-story reading progress only matters for the inline single-chapter read;
  // multi-chapter serials track progress per chapter on the chapter pages.
  const { savedPercent, restore, dismiss } = useReadingProgress({ storyId: story.id });

  const displayDate = story.publishedAt ?? story.createdAt;

  async function handleLike() {
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));
    try {
      const res = await toggleLike(story.id);
      setLiked(res.liked);
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      toast.error(formatError(err, "点赞失败"));
    } finally {
      setLiking(false);
    }
  }

  async function handleBookmark() {
    if (bookmarking) return;
    if (!currentUserId) {
      toast.error("请先登录后再收藏");
      return;
    }
    setBookmarking(true);
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);
    try {
      const res = await toggleBookmark(story.id);
      setBookmarked(res.bookmarked);
      toast.success(res.bookmarked ? "已收藏" : "已取消收藏");
    } catch (err) {
      setBookmarked(wasBookmarked);
      toast.error(formatError(err, "收藏失败"));
    } finally {
      setBookmarking(false);
    }
  }

  return (
    <article
      className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10"
      style={
        {
          "--reader-font-size": FONT_SIZE_PX[fontSize],
          "--reader-line-height": LINE_HEIGHT_VALUE[lineHeight],
        } as React.CSSProperties
      }
    >
      <header className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            {story.title}
          </h1>
          {isOwner && (
            <div className="shrink-0 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setContinueOpen(true)}
              >
                <Sparkles className="size-3.5" />
                续写
              </Button>
              <Link href={`/story/${story.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="size-3.5" />
                  编辑
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-muted-foreground">
          <Link
            href={`/users/${story.author.username}`}
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <User className="size-3.5" />
            {story.author.displayName || story.author.username}
          </Link>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {new Date(displayDate).toLocaleDateString("zh-CN")}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" />
            全文 {story.wordCount.toLocaleString()} 字 · 共 {chapterCount} 章 · 约 {readingMinutes(story.wordCount)} 分钟
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="size-3.5" />
            {formatCount(story.viewCount)} 阅读
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{story.fandom}</Badge>
          <CompletionBadge isComplete={story.isComplete} />
          <Badge variant={ratingVariants[story.rating] ?? "secondary"}>
            {ratingLabels[story.rating] ?? story.rating}
          </Badge>
          {story.ships.map((ship) => (
            <Badge
              key={ship}
              className="bg-accent/15 text-accent border-accent/30 whitespace-normal break-words text-left justify-start max-w-full"
            >
              {ship}
            </Badge>
          ))}
          {story.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 whitespace-normal break-words text-left justify-start max-w-full"
            >
              <Tag className="size-3 shrink-0" />
              {tag}
            </Badge>
          ))}
          {isOwner && (
            <CompletionToggleButton storyId={story.id} isComplete={story.isComplete} />
          )}
        </div>

        {story.summary && (
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
            {story.summary}
          </p>
        )}

        {remixedFrom && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Copy className="size-3.5 text-accent" />
            二创自
            <Link href={`/story/${remixedFrom.id}`} className="text-primary hover:underline">
              《{remixedFrom.title}》
            </Link>
          </p>
        )}
      </header>

      <Separator className="mb-8" />

      {chapterCount === 0 && (
        <div className="text-center py-16">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-surface mx-auto mb-4">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">暂无章节内容</p>
        </div>
      )}

      {isSingleChapter && firstChapterContent != null && (
        <ChapterBody
          chapterNumber={chapters[0].chapterNumber}
          chapterTitle={chapters[0].title}
          storyTitle={story.title}
          content={firstChapterContent}
          // Single-chapter story: the page h1 already serves as the heading.
          showHeading={false}
          showSeparator={false}
        />
      )}

      {chapterCount > 1 && (
        <ChapterTOC storyId={story.id} chapters={chapters} resumeChapter={resumeChapter} />
      )}

      <Separator className="my-10" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={liked ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={handleLike}
            aria-label={liked ? "取消点赞" : "点赞"}
          >
            <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
            {likeCount}
          </Button>
          <Button
            variant={bookmarked ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={handleBookmark}
            disabled={bookmarking}
            aria-label={bookmarked ? "取消收藏" : "收藏"}
          >
            {bookmarked ? (
              <BookmarkCheck className="size-3.5" />
            ) : (
              <Bookmark className="size-3.5" />
            )}
            {bookmarked ? "已收藏" : "收藏"}
          </Button>
          <a
            href="#comments"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <MessageSquare className="size-3.5" />
            {commentCount}
          </a>
          <ShareButton title={story.title} />
          {currentUserId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setCollectionOpen(true)}
            >
              <FolderPlus className="size-3.5" />
              合集
            </Button>
          )}
          <Link href={`/create?remixFrom=${story.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Copy className="size-3.5" />
              二创
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Link
            href={`/users/${story.author.username}`}
            className="hover:text-primary transition-colors"
          >
            @{story.author.username}
          </Link>
          <span>·</span>
          <span>{story.fandom}</span>
        </p>
      </div>

      {reactions && (
        <div className="mt-5">
          <ReactionBar
            storyId={story.id}
            initial={reactions}
            isLoggedIn={currentUserId !== null}
          />
        </div>
      )}

      <Separator className="my-10" />

      <CommentsSection storyId={story.id} currentUserId={currentUserId} />

      {isOwner && (
        <ContinueChapterDialog
          storyId={story.id}
          open={continueOpen}
          onOpenChange={setContinueOpen}
        />
      )}

      {currentUserId && (
        <AddToCollectionDialog
          storyId={story.id}
          open={collectionOpen}
          onOpenChange={setCollectionOpen}
        />
      )}

      <ViewTracker storyId={story.id} />
      {isSingleChapter && (
        <ReadingProgressTracker storyId={story.id} chapterNumber={chapters[0].chapterNumber} />
      )}

      <ReadingPrefs />
      {isSingleChapter && savedPercent !== null && (
        <ReadingProgressBanner
          percent={savedPercent}
          onRestore={restore}
          onDismiss={dismiss}
        />
      )}
    </article>
  );
}
