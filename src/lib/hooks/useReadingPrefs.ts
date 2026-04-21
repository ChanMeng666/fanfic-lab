"use client";

import { useCallback, useSyncExternalStore } from "react";

export type FontSize = "sm" | "md" | "lg";
export type LineHeight = "compact" | "normal" | "relaxed";

interface ReadingPrefs {
  fontSize: FontSize;
  lineHeight: LineHeight;
}

const STORAGE_KEY = "fanfic-lab:reading-prefs";
const DEFAULT_PREFS: ReadingPrefs = { fontSize: "md", lineHeight: "normal" };

// Per-tab pub/sub so multiple <ReadingPrefs /> instances stay in sync
// after the user picks a new value (the native `storage` event only
// fires across tabs, not within the same tab).
const listeners = new Set<() => void>();
let cachedSnapshot: ReadingPrefs | null = null;

function readFromStorage(): ReadingPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReadingPrefs>;
    return {
      fontSize: parsed.fontSize ?? DEFAULT_PREFS.fontSize,
      lineHeight: parsed.lineHeight ?? DEFAULT_PREFS.lineHeight,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onChange);
  }
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onChange);
    }
  };
}

function getSnapshot(): ReadingPrefs {
  // useSyncExternalStore demands a stable reference between renders when
  // the underlying value hasn't changed; recompute only after a write.
  if (cachedSnapshot === null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function getServerSnapshot(): ReadingPrefs {
  return DEFAULT_PREFS;
}

function persist(next: ReadingPrefs) {
  cachedSnapshot = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full / blocked — preferences just won't persist
  }
  listeners.forEach((l) => l());
}

/**
 * Lightweight reader preferences hook.
 *
 * Persists font size and line height to localStorage and returns the
 * current values plus setters. SSR-safe via useSyncExternalStore.
 */
export function useReadingPrefs() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setFontSize = useCallback((fontSize: FontSize) => {
    persist({ ...getSnapshot(), fontSize });
  }, []);

  const setLineHeight = useCallback((lineHeight: LineHeight) => {
    persist({ ...getSnapshot(), lineHeight });
  }, []);

  return { ...prefs, setFontSize, setLineHeight };
}

export const FONT_SIZE_PX: Record<FontSize, string> = {
  sm: "0.95rem",
  md: "1.075rem",
  lg: "1.25rem",
};

export const LINE_HEIGHT_VALUE: Record<LineHeight, string> = {
  compact: "1.65",
  normal: "1.85",
  relaxed: "2.1",
};
