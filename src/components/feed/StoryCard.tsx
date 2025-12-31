"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const ratingColors = {
  GENERAL: "bg-green-100 text-green-800",
  TEEN: "bg-yellow-100 text-yellow-800",
  MATURE: "bg-orange-100 text-orange-800",
  EXPLICIT: "bg-red-100 text-red-800",
};

const statusLabels = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800" },
  PUBLISHED: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
  COMPLETE: { label: "Complete", color: "bg-green-100 text-green-800" },
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
                className="w-16 h-20 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/story/${story.id}`} className="hover:underline">
                <h3 className="font-semibold truncate">{story.title}</h3>
              </Link>
              <p className="text-sm text-gray-500 truncate">
                by {story.author.username}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {story.fandom}
                </Badge>
                <span className="text-xs text-gray-400">
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
    <Card className="hover:shadow-lg transition-shadow overflow-hidden">
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
              <h3 className="font-bold text-lg hover:text-purple-600 transition-colors line-clamp-1">
                {story.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Link
                href={`/profile/${story.author.id}`}
                className="flex items-center gap-1 hover:underline"
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage src={story.author.avatarUrl} />
                  <AvatarFallback className="text-xs">
                    {story.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600">
                  {story.author.username}
                </span>
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">
                {formatDate(story.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={ratingColors[story.rating]}>{story.rating}</Badge>
            <Badge className={statusLabels[story.status].color}>
              {statusLabels[story.status].label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Summary */}
        <p className="text-sm text-gray-700 line-clamp-2 mb-3">
          {story.summary}
        </p>

        {/* Fandom & Ships */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            {story.fandom}
          </Badge>
          {story.ships.slice(0, 2).map((ship) => (
            <Badge key={ship} variant="outline" className="text-pink-600 border-pink-200">
              {ship}
            </Badge>
          ))}
          {story.ships.length > 2 && (
            <Badge variant="outline" className="text-gray-500">
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
            <Badge variant="outline" className="text-xs py-0 text-gray-500">
              +{story.tags.length - 4}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{formatNumber(story.wordCount)} words</span>
          <span>{story.chapterCount} ch.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className="gap-1 text-gray-500 hover:text-red-500"
          >
            <span>❤️</span>
            {formatNumber(story.likes)}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
            <span>💬</span>
            {formatNumber(story.comments)}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
