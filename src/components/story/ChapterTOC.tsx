import Link from "next/link";
import { BookOpen, ChevronRight, PlayCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCount } from "./reader-shared";

export interface ChapterTOCItem {
  id: string;
  title: string | null;
  chapterNumber: number;
  wordCount: number;
}

interface ChapterTOCProps {
  storyId: string;
  chapters: ChapterTOCItem[];
  /** The reader's last-read chapter number for this story (series-wide resume). */
  resumeChapter?: number | null;
}

/**
 * Table of contents for a multi-chapter (连载) story. Each row links to the
 * focused per-chapter reader at /story/[id]/chapter/[n]. When the reader has a
 * saved position past chapter 1, a "继续阅读" entry jumps them back to it.
 */
export function ChapterTOC({ storyId, chapters, resumeChapter }: ChapterTOCProps) {
  const canResume =
    resumeChapter != null && resumeChapter > 1 && resumeChapter <= chapters.length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="size-5 text-primary" />
          目录
          <span className="text-sm font-normal text-muted-foreground">
            共 {chapters.length} 章
          </span>
        </h2>
        {chapters.length > 0 && (
          <div className="flex items-center gap-2">
            {canResume && (
              <Button asChild size="sm" className="gap-1.5">
                <Link href={`/story/${storyId}/chapter/${resumeChapter}`}>
                  <History className="size-4" />
                  继续阅读第 {resumeChapter} 章
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant={canResume ? "outline" : "default"} className="gap-1.5">
              <Link href={`/story/${storyId}/chapter/${chapters[0].chapterNumber}`}>
                <PlayCircle className="size-4" />
                {canResume ? "从头开始" : "开始阅读"}
              </Link>
            </Button>
          </div>
        )}
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {chapters.map((ch) => (
          <li key={ch.id}>
            <Link
              href={`/story/${storyId}/chapter/${ch.chapterNumber}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/10 transition-colors"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-sm tabular-nums text-muted-foreground shrink-0">
                  第 {ch.chapterNumber} 章
                </span>
                {ch.title && (
                  <span className="truncate text-foreground">{ch.title}</span>
                )}
              </span>
              <span className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                {formatCount(ch.wordCount)} 字
                <ChevronRight className="size-4" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
