"use client";

import { Heart, BookOpen, Calendar, User, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toggleLike } from "@/lib/actions/story";
import { toast } from "sonner";

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

export function StoryReader({ story, initialLikeCount = 0, initialLiked = false }: StoryReaderProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liking, setLiking] = useState(false);

  const chapter = story.chapters[0];
  const displayDate = story.publishedAt ?? story.createdAt;

  async function handleLike() {
    if (liking) return;
    setLiking(true);
    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));
    try {
      const res = await toggleLike(story.id);
      setLiked(res.liked);
    } catch (err) {
      // Revert on error
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
      {/* Story header */}
      <header className="mb-8 space-y-4">
        <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          {story.title}
        </h1>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            {story.author.displayName || story.author.username}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {new Date(displayDate).toLocaleDateString("zh-CN")}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="size-3.5" />
            {story.wordCount.toLocaleString()} 字
          </span>
        </div>

        {/* Badges row */}
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

        {/* Summary */}
        {story.summary && (
          <Card className="bg-surface border-border">
            <CardContent className="py-4 px-5">
              <p className="text-muted-foreground text-sm leading-relaxed font-prose italic">
                {story.summary}
              </p>
            </CardContent>
          </Card>
        )}
      </header>

      <Separator className="mb-8" />

      {/* Chapter content */}
      {chapter ? (
        <section className="space-y-4">
          {chapter.title && (
            <h2 className="font-display text-xl font-semibold text-foreground">
              {chapter.title}
            </h2>
          )}
          <div className="font-prose text-foreground/90 leading-8 text-base md:text-lg whitespace-pre-wrap">
            {chapter.content}
          </div>
        </section>
      ) : (
        <div className="text-center py-16">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-surface mx-auto mb-4">
            <BookOpen className="size-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">暂无章节内容</p>
        </div>
      )}

      <Separator className="my-10" />

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <Button
          variant={liked ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={handleLike}
        >
          <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
          {likeCount > 0 ? likeCount : "喜欢"}
        </Button>

        <p className="text-xs text-muted-foreground">
          {story.wordCount.toLocaleString()} 字 · {story.fandom}
        </p>
      </div>
    </article>
  );
}
