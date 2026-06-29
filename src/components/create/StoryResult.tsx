"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, RefreshCw, Heart, FileText, Pencil, AlertTriangle, Loader2 } from "lucide-react";
import { toggleLike, updateStory } from "@/lib/actions/story";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import type { StoryResult as StoryResultType } from "@/lib/types/dreamwriter";
import type { SaveStatus } from "@/lib/hooks/useStoryCreation";

interface StoryResultProps {
  result: StoryResultType;
  storyId: string | null;
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  onCreateAnother: () => void;
  onRegenerate: () => void;
  onSuggestionClick: (suggestion: string) => void;
}

export function StoryResult({
  result,
  storyId,
  saveStatus,
  onRetrySave,
  onCreateAnother,
  onRegenerate,
  onSuggestionClick,
}: StoryResultProps) {
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [draftedAt, setDraftedAt] = useState<number | null>(null);
  const [drafting, setDrafting] = useState(false);

  async function handleLike() {
    if (!storyId || liking) return;
    setLiking(true);
    try {
      const res = await toggleLike(storyId);
      setLiked(res.liked);
    } catch (err) {
      toast.error(formatError(err, "收藏失败，请重试"));
    } finally {
      setLiking(false);
    }
  }

  async function handleSaveAsDraft() {
    if (!storyId || drafting) return;
    setDrafting(true);
    try {
      await updateStory({ id: storyId, status: "DRAFT" });
      setDraftedAt(Date.now());
      toast.success("已转为草稿，将不再出现在 Feed 中");
    } catch (err) {
      toast.error(formatError(err, "保存草稿失败"));
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Story Card */}
      <Card className="border-border bg-surface shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
                <BookOpen className="size-4" />
              </div>
              <span className="font-display text-xl">{result.title}</span>
            </span>
            <Badge
              variant={result.qualityScore <= 6 ? "outline" : "secondary"}
              className={`text-xs gap-1 ${result.qualityScore <= 6 ? "border-accent/50 text-accent" : ""}`}
            >
              <Sparkles className="size-3" />
              {result.qualityScore}/10
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {result.cp.map((c) => (
              <Badge
                key={c}
                variant="outline"
                className="text-xs whitespace-normal break-words text-left justify-start max-w-full rounded-md"
              >
                {c}
              </Badge>
            ))}
            {result.tags.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="text-xs whitespace-normal break-words text-left justify-start max-w-full rounded-md"
              >
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
          {result.qualityScore <= 6 && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-accent">
              <Sparkles className="size-3.5 shrink-0" />
              本篇质量评分偏低（或质检未完整跑完），可点「换一版（相同设定）」再试一次。
            </p>
          )}
        </CardContent>
      </Card>

      {/* Save status — never let a generated story be silently lost */}
      {saveStatus === "failed" && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            保存失败，你的故事还在这里。请重试保存，否则离开后会丢失。
          </p>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={onRetrySave}>
            <RefreshCw className="size-3.5" />
            重试保存
          </Button>
        </div>
      )}
      {saveStatus === "saving" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          正在保存到你的作品…
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="gap-1.5" onClick={onCreateAnother}>
          <RefreshCw className="size-3.5" />
          再来一篇
        </Button>
        <Button variant="ghost" className="gap-1.5" onClick={onRegenerate}>
          <Sparkles className="size-3.5" />
          换一版（相同设定）
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
        {storyId && (
          <Link href={`/story/${storyId}/edit`}>
            <Button variant="ghost" className="gap-1.5">
              <Pencil className="size-3.5" />
              编辑
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          className="gap-1.5"
          onClick={handleSaveAsDraft}
          disabled={!storyId || drafting || draftedAt !== null}
        >
          <FileText className="size-3.5" />
          {draftedAt !== null ? "已转为草稿" : drafting ? "处理中…" : "存为草稿"}
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
