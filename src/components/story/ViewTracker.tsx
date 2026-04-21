"use client";

import { useEffect } from "react";
import { recordStoryView } from "@/lib/actions/story";

interface ViewTrackerProps {
  storyId: string;
}

/**
 * Fires recordStoryView once per session per story. Uses sessionStorage so
 * a refresh in the same tab doesn't double-count, but a new tab/session
 * will count again — that matches what most readers expect from a "view".
 */
export function ViewTracker({ storyId }: ViewTrackerProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `story-viewed:${storyId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    recordStoryView(storyId).catch(() => {
      // Silent: a failed view increment shouldn't surface to the user.
      sessionStorage.removeItem(key);
    });
  }, [storyId]);

  return null;
}
