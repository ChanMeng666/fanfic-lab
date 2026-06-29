"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, MessageSquare, BookOpen, Eye } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface StoryCardData {
  id: string;
  title: string;
  summary: string;
  fandom: string;
  ships: string[];
  tags: string[];
  rating: "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT";
  status: "DRAFT" | "PUBLISHED" | "COMPLETE";
  wordCount: number;
  chapterCount: number;
  likes: number;
  comments: number;
  views?: number;
  coverUrl?: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  updatedAt: string;
}

interface StoryCardProps {
  story: StoryCardData;
  onLike?: () => void;
}

const ratingStyles = {
  GENERAL: "bg-success/20 text-success border-success/30",
  TEEN: "bg-warning/20 text-warning border-warning/30",
  MATURE: "bg-accent/20 text-accent-foreground border-accent/30",
  EXPLICIT: "bg-destructive/20 text-destructive border-destructive/30",
};

const ratingLabels: Record<string, string> = {
  GENERAL: "全年龄",
  TEEN: "青少年",
  MATURE: "成熟",
  EXPLICIT: "限制级",
};

const statusStyles = {
  DRAFT: { label: "草稿", className: "bg-muted text-muted-foreground" },
  PUBLISHED: { label: "连载中", className: "bg-primary/15 text-primary" },
  COMPLETE: { label: "已完结", className: "bg-success/15 text-success" },
};

function formatNumber(num: number) {
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  return date.toLocaleDateString("zh-CN");
}

export function StoryCard({ story, onLike }: StoryCardProps) {
  const storyHref = `/story/${story.id}`;

  return (
    <Card variant="story" className="overflow-hidden">
      {/* Stretched link covers the whole card; siblings (not children) so
          interactive controls below can sit on top via z-index without
          violating the no-nested-interactive HTML rule. */}
      <Link
        href={storyHref}
        aria-label={story.title}
        className="absolute inset-0 z-10"
      />

      {/* Cover Image */}
      {story.coverUrl && (
        <div className="relative h-32 overflow-hidden">
          <Image
            src={story.coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground line-clamp-1">
              {story.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <Link
                href={`/users/${story.author.username}`}
                className="relative z-20 flex items-center gap-1.5 hover:text-primary transition-colors"
              >
                <Avatar className="size-5">
                  <AvatarImage src={story.author.avatarUrl} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {story.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hover:text-primary">
                  {story.author.username}
                </span>
              </Link>
              <span className="text-border">|</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(story.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={cn("text-xs", ratingStyles[story.rating])}>
              {ratingLabels[story.rating] ?? story.rating}
            </Badge>
            <Badge variant="secondary" className={cn("text-xs", statusStyles[story.status].className)}>
              {statusStyles[story.status].label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {story.summary}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="secondary">{story.fandom}</Badge>
          {story.ships.slice(0, 2).map((ship) => (
            <Badge
              key={ship}
              variant="outline"
              className="text-accent-foreground border-accent/30 whitespace-normal break-words text-left justify-start max-w-full rounded-md"
            >
              {ship}
            </Badge>
          ))}
          {story.ships.length > 2 && (
            <Badge variant="outline" className="text-muted-foreground">
              +{story.ships.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {story.tags.slice(0, 4).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs py-0 whitespace-normal break-words text-left justify-start max-w-full rounded-md"
            >
              {tag}
            </Badge>
          ))}
          {story.tags.length > 4 && (
            <Badge variant="outline" className="text-xs py-0 text-muted-foreground">
              +{story.tags.length - 4}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {formatNumber(story.wordCount)} 字
          </span>
          <span>{story.chapterCount} 章</span>
          {typeof story.views === "number" && (
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" />
              {formatNumber(story.views)}
            </span>
          )}
        </div>
        <div className="relative z-20 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            aria-label="点赞"
            className="gap-1.5 text-muted-foreground hover:text-accent"
          >
            <Heart className="size-4" />
            {formatNumber(story.likes)}
          </Button>
          <Link
            href={`${storyHref}#comments`}
            aria-label="查看评论"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-md transition-colors"
          >
            <MessageSquare className="size-4" />
            {formatNumber(story.comments)}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
