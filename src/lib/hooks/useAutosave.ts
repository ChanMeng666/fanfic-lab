"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutosaveOptions {
  data: string;
  onSave: (data: string) => Promise<void>;
  interval?: number; // Autosave interval in milliseconds
  debounce?: number; // Debounce delay in milliseconds
  enabled?: boolean;
}

interface UseAutosaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<void>;
  hasUnsavedChanges: boolean;
}

export function useAutosave({
  data,
  onSave,
  interval = 30000, // Default: 30 seconds
  debounce = 2000, // Default: 2 seconds
  enabled = true,
}: UseAutosaveOptions): UseAutosaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const lastSavedDataRef = useRef<string>(data);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSave = useCallback(async () => {
    if (!enabled || data === lastSavedDataRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(data);
      lastSavedDataRef.current = data;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Autosave failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, enabled]);

  const saveNow = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Track changes
  useEffect(() => {
    if (data !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [data]);

  // Debounced save on data change
  useEffect(() => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounce);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, debounce, performSave, enabled]);

  // Interval-based save
  useEffect(() => {
    if (!enabled) return;

    intervalTimerRef.current = setInterval(() => {
      performSave();
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [interval, performSave, enabled]);

  // Save on page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        // Some browsers require returnValue
        e.returnValue = "";
        // Attempt to save
        performSave();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, performSave, enabled]);

  return {
    isSaving,
    lastSaved,
    saveNow,
    hasUnsavedChanges,
  };
}
