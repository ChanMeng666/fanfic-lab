"use client";

import Link from "next/link";
import { Heart, BookOpen, Calendar, User, Tag, MessageSquare, Pencil, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toggleLike } from "@/lib/actions/story";
import { toast } from "sonner";
import { CommentsSection } from "./CommentsSection";
import { ContinueChapterDialog } from "./ContinueChapterDialog";
import { ViewTracker } from "./ViewTracker";

interface StoryReaderProps {
  story: {
    id: string;
    title: string;
    summary: string | null;
    fandom: string;
    ships: string[];
    tags: string[];
    rating: string;
    wordCount: number;
    viewCount: number;
    publishedAt: Date | null;
    createdAt: Date;
    author: {
      displayName: string | null;
      username: string;
    };
    chapters: Array<{
      id: string;
      title: string | null;
      content: string;
      chapterNumber: number;
      wordCount: number;
    }>;
  };
  initialLikeCount?: number;
  initialLiked?: boolean;
  commentCount?: number;
  currentUserId?: string | null;
  isOwner?: boolean;
}

function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(1) + "k";
  return Math.floor(n / 1000) + "k";
}

// Average reading speed: ~300 Chinese chars / minute
function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 300));
}

const ratingLabels: Record<string, string> = {
  GENERAL: "全年龄",
  TEEN: "青少年",
  MATURE: "成熟",
  EXPLICIT: "限制级",
};

const ratingVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  GENERAL: "secondary",
  TEEN: "default",
  MATURE: "outline",
  EXPLICIT: "destructive",
};

export function StoryReader({
  story,
  initialLikeCount = 0,
  initialLiked = false,
  commentCount = 0,
  currentUserId = null,
  isOwner = false,
}: StoryReaderProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liking, setLiking] = useState(false);
  const [continueOpen, setContinueOpen] = useState(false);

  const displayDate = story.publishedAt ?? story.createdAt;
  const chapterCount = story.chapters.length;

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
      if (err instanceof Error && err.message.includes("Unauthorized")) {
        toast.error("请先登录后再点赞");
      } else {
        toast.error("操作失败，请重试");
      }
    } finally {
      setLiking(false);
    }
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <header className="mb-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
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

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
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

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{story.fandom}</Badge>
          <Badge variant={ratingVariants[story.rating] ?? "secondary"}>
            {ratingLabels[story.rating] ?? story.rating}
          </Badge>
          {story.ships.map((ship) => (
            <Badge key={ship} className="bg-accent/15 text-accent border-accent/30">
              {ship}
            </Badge>
          ))}
          {story.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              <Tag className="size-3" />
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      <Separator className="mb-8" />

      {chapterCount > 0 ? (
        <div className="space-y-12">
          {story.chapters.map((chapter, idx) => (
            <section key={chapter.id} className="space-y-4">
              {/* Skip chapter h2 entirely for single-chapter stories — the
                  page h1 (story title) already serves as the heading and a
                  second one looks duplicated. */}
              {chapterCount > 1 && (
                <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  第 {chapter.chapterNumber} 章
                  {chapter.title && chapter.title !== story.title
                    ? `：${chapter.title}`
                    : ""}
                </h2>
              )}
              <div className="font-prose text-foreground/90 leading-8 text-base md:text-lg whitespace-pre-wrap">
                {chapter.content}
              </div>
              {idx < story.chapters.length - 1 && <Separator className="mt-12" />}
            </section>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-surface mx-auto mb-4">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">暂无章节内容</p>
        </div>
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
          <a
            href="#comments"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <MessageSquare className="size-3.5" />
            {commentCount}
          </a>
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

      <Separator className="my-10" />

      <CommentsSection storyId={story.id} currentUserId={currentUserId} />

      {isOwner && (
        <ContinueChapterDialog
          storyId={story.id}
          open={continueOpen}
          onOpenChange={setContinueOpen}
        />
      )}

      <ViewTracker storyId={story.id} />
    </article>
  );
}
