"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, RefreshCw, Heart } from "lucide-react";
import { toggleLike } from "@/lib/actions/story";
import type { StoryResult as StoryResultType } from "@/lib/types/dreamwriter";

interface StoryResultProps {
  result: StoryResultType;
  storyId: string | null;
  onCreateAnother: () => void;
  onSuggestionClick: (suggestion: string) => void;
}

export function StoryResult({
  result,
  storyId,
  onCreateAnother,
  onSuggestionClick,
}: StoryResultProps) {
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  async function handleLike() {
    if (!storyId || liking) return;
    setLiking(true);
    try {
      const res = await toggleLike(storyId);
      setLiked(res.liked);
    } catch {
      // silent fail
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Story Card */}
      <Card className="border-accent/30 bg-surface shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
                <BookOpen className="size-4" />
              </div>
              <span className="font-display text-xl">{result.title}</span>
            </span>
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="size-3" />
              {result.qualityScore}/10
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {result.cp.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">
                {c}
              </Badge>
            ))}
            {result.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
            <Badge variant="secondary" className="text-xs">
              {result.wordCount} 字
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="font-prose text-foreground leading-relaxed whitespace-pre-wrap">
            {result.body}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-1.5" onClick={onCreateAnother}>
          <RefreshCw className="size-3.5" />
          再来一篇
        </Button>
        <Button
          variant={liked ? "default" : "ghost"}
          className="gap-1.5"
          onClick={handleLike}
          disabled={!storyId || liking}
        >
          <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
          {liked ? "已收藏" : "收藏"}
        </Button>
      </div>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">你可能还想看：</h3>
          <div className="flex flex-wrap gap-2">
            {result.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="px-3 py-1.5 text-sm rounded-full border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
