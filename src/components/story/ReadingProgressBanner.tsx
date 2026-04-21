"use client";

import { BookmarkCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReadingProgressBannerProps {
  percent: number;
  onRestore: () => void;
  onDismiss: () => void;
}

/**
 * Floating restore prompt shown when the user revisits a story they
 * scrolled through last time. Sits below the global header and is
 * dismissable; the parent decides when to render it.
 */
export function ReadingProgressBanner({
  percent,
  onRestore,
  onDismiss,
}: ReadingProgressBannerProps) {
  return (
    <div className="fixed top-20 right-4 sm:right-6 z-30 max-w-xs animate-fade-slide-in">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface/95 backdrop-blur-lg shadow-lg px-4 py-3">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary shrink-0">
          <BookmarkCheck className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            上次读到 {percent}%
          </p>
          <button
            type="button"
            onClick={onRestore}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            回到上次位置
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="忽略"
          onClick={onDismiss}
          className="size-7 -mt-1 -mr-1 rounded-full"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
