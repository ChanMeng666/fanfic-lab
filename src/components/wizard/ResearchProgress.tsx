"use client";

/**
 * Research Progress Component - Minimal Version
 * Displays a Lottie animation with simple status text
 *
 * Cache Strategy (Frontend-side):
 * 1. Check cache via /api/research-cache BEFORE triggering agent
 * 2. If cache hit, return immediately (saves API costs!)
 * 3. If cache miss, trigger agent, then save results to cache
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Lottie from "lottie-react";
import loadingAnimation from "@/../public/lottie/loading.json";
import type { SourceType, SourceResearchData } from "@/lib/types/agent-state";

interface ResearchProgressProps {
  sourceName: string;
  sourceType: SourceType;
  onComplete: (data: SourceResearchData) => void;
  onError?: (error: string) => void;
}

type ResearchStatus =
  | "connecting"
  | "checking_cache"
  | "loading_cache"
  | "researching"
  | "complete";

const STATUS_MESSAGES: Record<ResearchStatus, string> = {
  connecting: "Connecting...",
  checking_cache: "Checking cache...",
  loading_cache: "Loading cached data...",
  researching: "Gathering characters and story info...",
  complete: "Research complete",
};

export function ResearchProgress({
  sourceName,
  sourceType,
  onComplete,
  onError,
}: ResearchProgressProps) {
  const [status, setStatus] = useState<ResearchStatus>("connecting");

  // Use refs for values that shouldn't trigger effect re-runs
  const hasTriggeredRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Store callbacks in refs to avoid effect dependency issues
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Save research to cache (frontend-side)
  const saveToCache = useCallback(async (data: SourceResearchData) => {
    try {
      await fetch("/api/research-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName,
          sourceType,
          researchData: data,
        }),
      });
    } catch (error) {
      console.error("[ResearchProgress] Failed to save to cache:", error);
    }
  }, [sourceName, sourceType]);

  // Complete research with data
  const completeResearch = useCallback((data: SourceResearchData, fromCache: boolean) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    setStatus("complete");

    // Save to cache if not from cache
    if (!fromCache) {
      saveToCache(data);
    }

    // Small delay to show completion
    setTimeout(() => {
      onCompleteRef.current(data);
    }, 800);
  }, [saveToCache]);

  // Store completeResearch in ref for use in initialization effect
  const completeResearchRef = useRef(completeResearch);
  useEffect(() => {
    completeResearchRef.current = completeResearch;
  }, [completeResearch]);

  // MAIN INITIALIZATION EFFECT - runs once on mount
  useEffect(() => {
    if (hasInitializedRef.current || !sourceName) return;
    hasInitializedRef.current = true;

    const initialize = async () => {
      setStatus("checking_cache");

      // Create abort controller for fetch timeout (8 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000);

      try {
        const response = await fetch(
          `/api/research-cache?sourceName=${encodeURIComponent(sourceName)}&sourceType=${encodeURIComponent(sourceType)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Cache API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.cached && result.data) {
          // CACHE HIT!
          setStatus("loading_cache");
          setTimeout(() => {
            completeResearchRef.current(result.data, true);
          }, 500);
        } else {
          // CACHE MISS - trigger agent research
          await triggerAgent();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        // Always continue with agent research on any error
        await triggerAgent();
      }
    };

    // Trigger agent research
    const triggerAgent = async () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      setStatus("researching");

      try {
        const response = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "continue",
            content: `Research "${sourceName}" (${sourceType}) for fanfiction writing. Provide main characters, relationships, plot summary, world settings, and popular ships.`,
            storyContext: { fandom: sourceName, ships: [], tags: [], plotPoints: [], currentChapter: 1, characters: [], tone: "neutral" },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.result) {
            try {
              const parsed = JSON.parse(data.result);
              completeResearchRef.current(parsed, false);
            } catch {
              onErrorRef.current?.("Failed to parse research results");
            }
          }
        } else {
          onErrorRef.current?.("Research request failed");
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        onErrorRef.current?.(`Failed to start research: ${errorMsg}`);
      }
    };

    // Start initialization after a small delay
    const timer = setTimeout(initialize, 100);

    return () => {
      if (!hasInitializedRef.current) {
        clearTimeout(timer);
      }
    };
  }, [sourceName, sourceType]);

  // Timeout fallback - if no response in 90 seconds
  useEffect(() => {
    if (status === "loading_cache" || status === "complete") return;

    const timeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        onErrorRef.current?.("Research is taking longer than expected. Please try again.");
      }
    }, 90000);

    return () => clearTimeout(timeout);
  }, [status]);

  const isComplete = status === "complete";

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] animate-fade-slide-in">
      {/* Lottie Animation */}
      <div className="w-32 h-32">
        <Lottie
          animationData={loadingAnimation}
          loop={!isComplete}
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Status Text */}
      <p className="text-sm text-muted-foreground mt-4">
        {STATUS_MESSAGES[status]}
      </p>
    </div>
  );
}
