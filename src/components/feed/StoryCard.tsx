"use client";

import Link from "next/link";
import { Heart, MessageSquare, BookOpen } from "lucide-react";
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
  variant?: "full" | "compact";
  onLike?: () => void;
}

const ratingStyles = {
  GENERAL: "bg-success/10 text-success border-success/20",
  TEEN: "bg-warning/10 text-warning border-warning/20",
  MATURE: "bg-accent/10 text-accent-foreground border-accent/20",
  EXPLICIT: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusStyles = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  PUBLISHED: { label: "In Progress", className: "bg-primary/10 text-primary" },
  COMPLETE: { label: "Complete", className: "bg-success/10 text-success" },
};

export function StoryCard({ story, variant = "full", onLike }: StoryCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (variant === "compact") {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-3">
            {story.coverUrl && (
              <img
                src={story.coverUrl}
                alt={story.title}
                className="w-16 h-20 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/story/${story.id}`} className="hover:underline">
                <h3 className="font-semibold text-foreground truncate">
                  {story.title}
                </h3>
              </Link>
              <p className="text-sm text-muted-foreground truncate">
                by {story.author.username}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {story.fandom}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(story.wordCount)} words
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="story" className="overflow-hidden">
      {/* Cover Image */}
      {story.coverUrl && (
        <div className="h-32 overflow-hidden">
          <img
            src={story.coverUrl}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/story/${story.id}`}>
              <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors line-clamp-1">
                {story.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1.5">
              <Link
                href={`/profile/${story.author.id}`}
                className="flex items-center gap-1.5 hover:underline"
              >
                <Avatar className="size-5">
                  <AvatarImage src={story.author.avatarUrl} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {story.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
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
              {story.rating}
            </Badge>
            <Badge variant="secondary" className={cn("text-xs", statusStyles[story.status].className)}>
              {statusStyles[story.status].label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {story.summary}
        </p>

        {/* Fandom & Ships */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="secondary">{story.fandom}</Badge>
          {story.ships.slice(0, 2).map((ship) => (
            <Badge
              key={ship}
              variant="outline"
              className="text-accent-foreground border-accent/30"
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

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {story.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs py-0">
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
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="size-3.5" />
            {formatNumber(story.wordCount)} words
          </span>
          <span>{story.chapterCount} ch.</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className="gap-1.5 text-muted-foreground hover:text-accent"
          >
            <Heart className="size-4" />
            {formatNumber(story.likes)}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <MessageSquare className="size-4" />
            {formatNumber(story.comments)}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
