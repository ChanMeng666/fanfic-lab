"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "fanfic-lab:reading-progress:";
const SAVE_THROTTLE_MS = 1500;
// Below this percent we treat it as "near the top" — no point restoring.
const MIN_RESTORE_PERCENT = 5;
// Above this we treat the user as essentially done.
const MAX_RESTORE_PERCENT = 95;

interface UseReadingProgressOptions {
  storyId: string;
  /**
   * Optional chapter number. When provided, progress is tracked per-chapter
   * (storage key `${storyId}:ch${chapterNumber}`) so each chapter of a serial
   * remembers its own scroll position independently.
   */
  chapterNumber?: number;
  /**
   * Skip writing for the first N ms after mount so that restoring scroll
   * to a saved position doesn't immediately overwrite the saved value
   * with the pre-restore (top-of-page) value.
   */
  warmupMs?: number;
}

function key(scope: string) {
  return `${STORAGE_PREFIX}${scope}`;
}

function readSavedPercent(scope: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(scope));
    if (!raw) return null;
    const num = Number(raw);
    if (!Number.isFinite(num)) return null;
    if (num < MIN_RESTORE_PERCENT || num > MAX_RESTORE_PERCENT) return null;
    return num;
  } catch {
    return null;
  }
}

function currentScrollPercent(): number {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const max = (doc.scrollHeight - window.innerHeight) || 1;
  return Math.max(0, Math.min(100, (scrollTop / max) * 100));
}

/**
 * Track and persist reading progress for a story in localStorage.
 *
 * The hook writes the current scroll percent on a throttle while the
 * user reads, and exposes `savedPercent` (the value found at mount) so
 * the parent can offer a "jump back" affordance. `clearSaved` can be
 * called to dismiss the prompt without reverting to top-of-page.
 */
export function useReadingProgress({
  storyId,
  chapterNumber,
  warmupMs = 800,
}: UseReadingProgressOptions) {
  const scope =
    typeof chapterNumber === "number" ? `${storyId}:ch${chapterNumber}` : storyId;
  const [savedPercent, setSavedPercent] = useState<number | null>(null);
  const lastWrittenRef = useRef<number>(-1);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedAtRef = useRef<number | null>(null);

  // Read once on mount to populate `savedPercent` for the restore banner.
  useEffect(() => {
    setSavedPercent(readSavedPercent(scope));
  }, [scope]);

  // Subscribe to scroll and persist a throttled snapshot.
  useEffect(() => {
    if (typeof window === "undefined") return;
    mountedAtRef.current = Date.now();

    function persistNow() {
      const percent = currentScrollPercent();
      // Below the floor — clear the slot so a fresh visit doesn't
      // immediately offer to restore to "5%".
      if (percent < MIN_RESTORE_PERCENT) {
        try {
          localStorage.removeItem(key(scope));
        } catch {}
        lastWrittenRef.current = 0;
        return;
      }
      const rounded = Math.round(percent);
      if (rounded === lastWrittenRef.current) return;
      lastWrittenRef.current = rounded;
      try {
        localStorage.setItem(key(scope), String(rounded));
      } catch {}
    }

    function onScroll() {
      // Skip during the warmup window so a programmatic restore doesn't
      // get clobbered by a fresh "I'm at top" save.
      const mountedAt = mountedAtRef.current;
      if (mountedAt === null || Date.now() - mountedAt < warmupMs) return;
      if (saveTimerRef.current) return;
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        persistNow();
      }, SAVE_THROTTLE_MS);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [scope, warmupMs]);

  const restore = useCallback(() => {
    if (savedPercent == null) return;
    const doc = document.documentElement;
    const target = (doc.scrollHeight - window.innerHeight) * (savedPercent / 100);
    window.scrollTo({ top: target, behavior: "smooth" });
    setSavedPercent(null);
  }, [savedPercent]);

  const dismiss = useCallback(() => {
    setSavedPercent(null);
  }, []);

  return { savedPercent, restore, dismiss };
}
