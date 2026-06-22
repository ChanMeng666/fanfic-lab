import { memo } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Shared presentational pieces + helpers used by both the story overview
// (StoryReader) and the focused per-chapter reader (ChapterReader).

export const ratingLabels: Record<string, string> = {
  GENERAL: "全年龄",
  TEEN: "青少年",
  MATURE: "成熟",
  EXPLICIT: "限制级",
};

export const ratingVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  GENERAL: "secondary",
  TEEN: "default",
  MATURE: "outline",
  EXPLICIT: "destructive",
};

export function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(1) + "k";
  return Math.floor(n / 1000) + "k";
}

// Average reading speed: ~300 Chinese chars / minute
export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 300));
}

/**
 * Serialization-state badge. Decoupled from `status` (visibility): a story is
 * 连载中 (isComplete=false) or 已完结 (isComplete=true).
 */
export function CompletionBadge({ isComplete }: { isComplete: boolean }) {
  return isComplete ? (
    <Badge className="bg-success/15 text-success border-success/30">已完结</Badge>
  ) : (
    <Badge className="bg-primary/15 text-primary border-primary/30">连载中</Badge>
  );
}

interface ChapterBodyProps {
  chapterNumber: number;
  chapterTitle: string | null;
  storyTitle: string;
  content: string;
  showHeading: boolean;
  showSeparator: boolean;
}

// Memoized so like-toggle / dialog state in the parent doesn't re-render
// long chapter bodies. Re-renders only when the chapter content itself
// or its display flags change.
export const ChapterBody = memo(function ChapterBody({
  chapterNumber,
  chapterTitle,
  storyTitle,
  content,
  showHeading,
  showSeparator,
}: ChapterBodyProps) {
  return (
    <section className="space-y-4">
      {showHeading && (
        <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
          第 {chapterNumber} 章
          {chapterTitle && chapterTitle !== storyTitle ? `：${chapterTitle}` : ""}
        </h2>
      )}
      <div
        className="font-prose text-foreground/90 whitespace-pre-wrap"
        style={{
          fontSize: "var(--reader-font-size, 1.075rem)",
          lineHeight: "var(--reader-line-height, 1.85)",
        }}
      >
        {content}
      </div>
      {showSeparator && <Separator className="mt-12" />}
    </section>
  );
});
