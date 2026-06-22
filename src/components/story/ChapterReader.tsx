"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, List, Pencil, Sparkles, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContinueChapterDialog } from "./ContinueChapterDialog";
import { ProposeBranchDialog } from "./ProposeBranchDialog";
import { ReadingProgressTracker } from "./ReadingProgressTracker";
import { ViewTracker } from "./ViewTracker";
import { ReadingPrefs } from "./ReadingPrefs";
import { ReadingProgressBanner } from "./ReadingProgressBanner";
import { ChapterBody } from "./reader-shared";
import {
  useReadingPrefs,
  useReadingProgress,
  FONT_SIZE_PX,
  LINE_HEIGHT_VALUE,
} from "@/lib/hooks";

interface ChapterReaderProps {
  storyId: string;
  storyTitle: string;
  chapter: {
    id: string;
    title: string | null;
    content: string;
    chapterNumber: number;
    wordCount: number;
  };
  // All chapters' metadata, ordered, for the jump dropdown + prev/next.
  chapters: Array<{ chapterNumber: number; title: string | null }>;
  isOwner?: boolean;
  // Community branch续写: readers (logged in) can fork off this chapter when the
  // author has branching enabled on a published story.
  isLoggedIn?: boolean;
  allowBranching?: boolean;
}

export function ChapterReader({
  storyId,
  storyTitle,
  chapter,
  chapters,
  isOwner = false,
  isLoggedIn = false,
  allowBranching = false,
}: ChapterReaderProps) {
  const router = useRouter();
  const [continueOpen, setContinueOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const { fontSize, lineHeight } = useReadingPrefs();
  const { savedPercent, restore, dismiss } = useReadingProgress({
    storyId,
    chapterNumber: chapter.chapterNumber,
  });

  const total = chapters.length;
  const idx = chapters.findIndex((c) => c.chapterNumber === chapter.chapterNumber);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx >= 0 && idx < total - 1 ? chapters[idx + 1] : null;

  const chapterHref = (n: number) => `/story/${storyId}/chapter/${n}`;

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
      {/* Top bar: back to overview + chapter jump + owner actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/story/${storyId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors min-w-0"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <span className="truncate max-w-[12rem] sm:max-w-xs">{storyTitle}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Select
            value={String(chapter.chapterNumber)}
            onValueChange={(v) => router.push(chapterHref(Number(v)))}
          >
            <SelectTrigger className="h-8 w-[8.5rem] text-sm" aria-label="跳转章节">
              <List className="size-3.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((c) => (
                <SelectItem key={c.chapterNumber} value={String(c.chapterNumber)}>
                  第 {c.chapterNumber} 章
                  {c.title ? `：${c.title}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setContinueOpen(true)}
              >
                <Sparkles className="size-3.5" />
                续写
              </Button>
              <Link href={`/story/${storyId}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="size-3.5" />
                  编辑
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      <ChapterBody
        chapterNumber={chapter.chapterNumber}
        chapterTitle={chapter.title}
        storyTitle={storyTitle}
        showHeading
        showSeparator={false}
        content={chapter.content}
      />

      <Separator className="my-10" />

      {/* Prev / next navigation */}
      <nav className="flex items-center justify-between gap-3">
        {prev ? (
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={chapterHref(prev.chapterNumber)}>
              <ChevronLeft className="size-4" />
              上一章
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="gap-1.5" disabled>
            <ChevronLeft className="size-4" />
            上一章
          </Button>
        )}

        <span className="text-sm text-muted-foreground tabular-nums">
          {chapter.chapterNumber} / {total}
        </span>

        {next ? (
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={chapterHref(next.chapterNumber)}>
              下一章
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="default" className="gap-1.5">
            <Link href={`/story/${storyId}`}>
              已是最新章 · 返回作品页
            </Link>
          </Button>
        )}
      </nav>

      {isLoggedIn && allowBranching && (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-2xl border border-accent/30 bg-ai-surface ai-glow px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            脑补了不一样的走向？让 AI 沿用原作风格，把它写成一个分支。
          </p>
          <Button className="gap-1.5" onClick={() => setBranchOpen(true)}>
            <GitBranch className="size-4" />
            从这一章之后续写
          </Button>
        </div>
      )}

      {isOwner && (
        <ContinueChapterDialog
          storyId={storyId}
          open={continueOpen}
          onOpenChange={setContinueOpen}
        />
      )}

      {isLoggedIn && allowBranching && (
        <ProposeBranchDialog
          storyId={storyId}
          parentChapterId={chapter.id}
          parentChapterNumber={chapter.chapterNumber}
          open={branchOpen}
          onOpenChange={setBranchOpen}
        />
      )}

      <ViewTracker storyId={storyId} />
      <ReadingProgressTracker storyId={storyId} chapterNumber={chapter.chapterNumber} />
      <ReadingPrefs />
      {savedPercent !== null && (
        <ReadingProgressBanner
          percent={savedPercent}
          onRestore={restore}
          onDismiss={dismiss}
        />
      )}
    </article>
  );
}
