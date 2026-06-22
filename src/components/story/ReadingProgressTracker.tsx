"use client";

import { useEffect } from "react";
import { recordReadingProgress } from "@/lib/actions/reading-progress";

interface ReadingProgressTrackerProps {
  storyId: string;
  chapterNumber: number;
}

/**
 * Records the reader's position (last chapter opened) once per mount. No-op for
 * anonymous readers (the server action resolves no user). Mirrors ViewTracker.
 */
export function ReadingProgressTracker({ storyId, chapterNumber }: ReadingProgressTrackerProps) {
  useEffect(() => {
    recordReadingProgress(storyId, chapterNumber).catch(() => {});
  }, [storyId, chapterNumber]);

  return null;
}
