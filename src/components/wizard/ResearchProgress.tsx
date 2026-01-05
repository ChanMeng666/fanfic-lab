"use client";

/**
 * Research Progress Component
 * Displays progress and polls agent state for completion
 *
 * Cache Strategy (Vercel-side):
 * 1. Check cache via /api/research-cache BEFORE triggering agent
 * 2. If cache hit, return immediately (saves API costs!)
 * 3. If cache miss, trigger agent, then save results to cache
 *
 * v4.0 - Fixed: Timer was being cancelled by React cleanup due to
 *        dependency changes. Now using refs to store callbacks.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useCoAgent, useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import {
  Search,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SourceType, SourceResearchData, FanficAgentState, AgentLog } from "@/lib/types/agent-state";

interface ResearchProgressProps {
  sourceName: string;
  sourceType: SourceType;
  onComplete: (data: SourceResearchData) => void;
  onError?: (error: string) => void;
}

// Static progress steps for visual feedback (used when cache miss)
const RESEARCH_STEPS = [
  { message: "🌐 Searching for characters and personalities...", delay: 0 },
  { message: "📚 Researching plot and story elements...", delay: 2000 },
  { message: "🌍 Exploring world settings and lore...", delay: 4000 },
  { message: "💕 Finding popular ships and relationships...", delay: 6000 },
  { message: "🤖 AI is analyzing and summarizing results...", delay: 8000 },
  { message: "✨ Formatting research data...", delay: 12000 },
];

export function ResearchProgress({
  sourceName,
  sourceType,
  onComplete,
  onError,
}: ResearchProgressProps) {
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [displayLogs, setDisplayLogs] = useState<AgentLog[]>([]);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("v4.0 Initializing...");
  const [hasTriggered, setHasTriggered] = useState(false);

  // Use refs for values that shouldn't trigger effect re-runs
  const hasTriggeredRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Get agent state via useCoAgent for polling
  const { state: agentState, running } = useCoAgent<FanficAgentState>({
    name: "fanfic_agent",
  });

  // Get CopilotChat to trigger research
  const { appendMessage } = useCopilotChat();

  // Store callbacks in refs to avoid effect dependency issues
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const appendMessageRef = useRef(appendMessage);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    appendMessageRef.current = appendMessage;
  }, [appendMessage]);

  // Debug: Log component mount
  useEffect(() => {
    console.log("[ResearchProgress] 🎬 Component mounted!", { sourceName, sourceType });
    setDebugInfo(`v4.0 Mounted: ${sourceName}`);
  }, [sourceName, sourceType]);

  // Debug: Monitor agent running state
  useEffect(() => {
    console.log("[ResearchProgress] 📊 Agent running state changed:", running);
    if (running) {
      setDebugInfo("v4.0 Agent IS RUNNING!");
    }
  }, [running]);

  // Debug: Monitor agent state updates
  useEffect(() => {
    if (agentState) {
      console.log("[ResearchProgress] 📊 Agent state update:", {
        hasWizardSession: !!agentState.wizardSession,
        hasResearchData: !!agentState.wizardSession?.researchData,
        logsCount: agentState.logs?.length || 0,
      });
    }
  }, [agentState]);

  // Save research to cache (Vercel-side)
  const saveToCache = useCallback(async (data: SourceResearchData) => {
    try {
      console.log("[ResearchProgress] Saving to cache...");
      await fetch("/api/research-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName,
          sourceType,
          researchData: data,
        }),
      });
      console.log("[ResearchProgress] Saved to cache successfully");
    } catch (error) {
      console.error("[ResearchProgress] Failed to save to cache:", error);
    }
  }, [sourceName, sourceType]);

  // Complete research with data
  const completeResearch = useCallback((data: SourceResearchData, fromCache: boolean) => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;

    console.log("[ResearchProgress] Research complete!", {
      fromCache,
      charactersFound: data.mainCharacters?.length || 0,
      hasPlot: !!data.originalPlot,
      hasWorldSettings: !!data.worldSettings,
      shipsFound: data.popularShips?.length || 0,
    });

    // Mark all steps as complete
    setDisplayLogs((prev) => prev.map((log) => ({ ...log, done: true })));
    setOverallProgress(100);
    setIsComplete(true);

    // Save to cache if not from cache
    if (!fromCache) {
      saveToCache(data);
    }

    // Small delay to show completion animation
    setTimeout(() => {
      onCompleteRef.current(data);
    }, 1000);
  }, [saveToCache]);

  // Store completeResearch in ref for use in initialization effect
  const completeResearchRef = useRef(completeResearch);
  useEffect(() => {
    completeResearchRef.current = completeResearch;
  }, [completeResearch]);

  // MAIN INITIALIZATION EFFECT - runs once on mount
  // Uses refs for callbacks to avoid cleanup clearing the timer
  useEffect(() => {
    // Strict one-time initialization check
    if (hasInitializedRef.current || !sourceName) return;
    hasInitializedRef.current = true;
    setCacheChecked(true);

    console.log("[ResearchProgress] 🚀 v4.0 Initialization starting...");
    setDebugInfo("v4.0 Starting...");

    // Define the async initialization function
    const initialize = async () => {
      console.log("[ResearchProgress] 🔍 checkCache starting for:", sourceName);
      setDebugInfo("v4.0 Checking cache...");
      setDisplayLogs([{ message: "🔍 Checking research cache...", done: false }]);
      setOverallProgress(5);

      // Create abort controller for fetch timeout (8 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn("[ResearchProgress] ⏰ Cache check TIMEOUT!");
        controller.abort();
      }, 8000);

      try {
        console.log("[ResearchProgress] 📡 Fetching cache API...");
        const response = await fetch(
          `/api/research-cache?sourceName=${encodeURIComponent(sourceName)}&sourceType=${encodeURIComponent(sourceType)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        console.log("[ResearchProgress] 📥 Cache API response status:", response.status);

        if (!response.ok) {
          console.warn("[ResearchProgress] Cache API error:", response.status);
          throw new Error(`Cache API error: ${response.status}`);
        }

        const result = await response.json();
        console.log("[ResearchProgress] 📊 Cache result:", { cached: result.cached, latency: result.latency });

        if (result.cached && result.data) {
          // CACHE HIT!
          console.log("[ResearchProgress] ✅ CACHE HIT!");
          setDebugInfo("v4.0 CACHE HIT!");
          setCacheHit(true);
          setDisplayLogs([
            { message: "🔍 Checking research cache...", done: true },
            { message: `✅ Found cached research! (used ${result.searchCount} times)`, done: true },
            { message: "📚 Loading research data...", done: true },
          ]);
          setOverallProgress(100);
          completeResearchRef.current(result.data, true);
        } else {
          // CACHE MISS - trigger agent research
          console.log("[ResearchProgress] ❌ CACHE MISS - triggering agent...");
          setDebugInfo("v4.0 Cache miss, triggering agent...");
          setDisplayLogs([{ message: "🔍 No cache found, starting fresh research...", done: true }]);
          await triggerAgent();
        }
      } catch (error) {
        clearTimeout(timeoutId);
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("[ResearchProgress] ❌ Cache check error:", errorMsg);

        if (error instanceof Error && error.name === "AbortError") {
          console.warn("[ResearchProgress] Cache check timed out");
          setDebugInfo("v4.0 Cache timeout, triggering agent...");
        } else {
          setDebugInfo(`v4.0 Cache error: ${errorMsg.substring(0, 30)}`);
        }

        // Always continue with agent research on any error
        console.log("[ResearchProgress] 🔄 Falling back to agent research");
        setDisplayLogs([{ message: "🔍 Cache unavailable, starting fresh research...", done: true }]);
        await triggerAgent();
      }
    };

    // Trigger agent research
    const triggerAgent = async () => {
      if (hasTriggeredRef.current) {
        console.log("[ResearchProgress] Agent already triggered, skipping");
        return;
      }
      hasTriggeredRef.current = true;
      setHasTriggered(true);

      const messageContent = `Please use the research_source_materials tool to research "${sourceName}" (${sourceType}) for fanfiction writing. Search for characters, plot, world settings, and popular ships.`;

      console.log("[ResearchProgress] 🚀 Triggering agent research...");
      console.log("[ResearchProgress] Message:", messageContent);
      setDebugInfo("v4.0 Triggering agent...");

      try {
        console.log("[ResearchProgress] 📤 Calling appendMessage...");
        await appendMessageRef.current(
          new TextMessage({
            role: MessageRole.User,
            content: messageContent,
          })
        );
        console.log("[ResearchProgress] ✅ appendMessage completed!");
        setDebugInfo("v4.0 Agent triggered! Waiting...");
      } catch (error) {
        console.error("[ResearchProgress] ❌ appendMessage FAILED:", error);
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        setDebugInfo(`v4.0 ERROR: ${errorMsg.substring(0, 50)}`);
        onErrorRef.current?.(`Failed to start research: ${errorMsg}`);
      }
    };

    // Start initialization after a small delay to ensure mount is complete
    const timer = setTimeout(initialize, 100);

    // No cleanup - we want the timer to complete even if dependencies change
    // The hasInitializedRef prevents double execution
    return () => {
      // Only clear if not yet initialized (component unmounted before init)
      if (!hasInitializedRef.current) {
        clearTimeout(timer);
      }
    };
  }, [sourceName, sourceType]); // Minimal dependencies - only source info

  // Animate progress steps for visual feedback (only when cache miss)
  useEffect(() => {
    if (hasCompletedRef.current || cacheHit || !cacheChecked) return;

    const timers: NodeJS.Timeout[] = [];

    RESEARCH_STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        if (hasCompletedRef.current) return;

        setDisplayLogs((prev) => {
          // Don't add if already exists
          if (prev.some((log) => log.message === step.message)) return prev;

          // Mark previous steps as done
          const updated = prev.map((log) => ({ ...log, done: true }));
          return [...updated, { message: step.message, done: false }];
        });

        // Progress from 10% to 80% during steps
        setOverallProgress(10 + (index / RESEARCH_STEPS.length) * 70);
      }, step.delay + 500); // Add 500ms offset for cache check

      timers.push(timer);
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [cacheChecked, cacheHit]);

  // Poll agent state for research completion (only when cache miss)
  useEffect(() => {
    if (cacheHit) return; // Skip if cache hit

    const researchData = agentState?.wizardSession?.researchData;
    const hasResearchData = researchData && (
      researchData.mainCharacters !== undefined ||
      researchData.originalPlot !== undefined ||
      researchData.worldSettings !== undefined
    );

    if (!hasCompletedRef.current && hasResearchData) {
      completeResearch(researchData, false);
    }
  }, [agentState, cacheHit, completeResearch]);

  // Also check agent logs if streaming works
  useEffect(() => {
    if (cacheHit) return; // Skip if cache hit

    if (agentState?.logs?.length && !hasCompletedRef.current) {
      console.log("[ResearchProgress] Received logs from agent:", agentState.logs.length);
      if (agentState.logs.length > displayLogs.length) {
        setDisplayLogs(agentState.logs);
        const completedCount = agentState.logs.filter((log) => log.done).length;
        setOverallProgress((completedCount / agentState.logs.length) * 100);
      }
    }
  }, [agentState?.logs, displayLogs.length, cacheHit]);

  // Timeout fallback - if no response in 90 seconds (only for cache miss)
  useEffect(() => {
    if (cacheHit) return; // No timeout needed for cache hit

    const timeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.log("[ResearchProgress] Research timeout");
        setDebugInfo("v4.0 TIMEOUT - Agent not responding");
        onErrorRef.current?.("Research is taking longer than expected. The AI agent may be unavailable. Please try again.");
      }
    }, 90000);

    return () => clearTimeout(timeout);
  }, [cacheHit]);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-8 animate-fade-slide-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-accent/10 text-accent mb-4 ai-glow">
          <Search className="size-8" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Researching Your Source
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          AI is searching the web for information about{" "}
          <span className="text-accent font-medium">{sourceName}</span>
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall Progress</span>
          <span className="font-medium text-foreground">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Log List - Animated progress steps */}
      <div className="space-y-3">
        {displayLogs.length === 0 ? (
          // Initial loading state
          <div className="flex items-center gap-4 p-4 rounded-xl border border-accent/30 bg-accent/5 ai-glow">
            <div className="flex items-center justify-center size-10 rounded-lg bg-accent/15 text-accent">
              <Loader2 className="size-5 animate-spin" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-accent">Starting Research...</p>
              <p className="text-xs text-muted-foreground">
                Connecting to Tavily AI search...
              </p>
            </div>
          </div>
        ) : (
          displayLogs.map((log, index) => {
            const isDone = log.done;
            const isActive = !isDone && index === displayLogs.findIndex((l) => !l.done);
            const isPending = !isDone && !isActive;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all",
                  isDone && "border-primary/30 bg-primary/5",
                  isActive && "border-accent/30 bg-accent/5 ai-glow",
                  isPending && "border-border bg-surface opacity-50"
                )}
              >
                {/* Status Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center size-10 rounded-lg",
                    isDone && "bg-primary/15 text-primary",
                    isActive && "bg-accent/15 text-accent",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isActive ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <div className="size-2 rounded-full bg-muted-foreground" />
                  )}
                </div>

                {/* Log Message */}
                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      isDone && "text-foreground",
                      isActive && "text-accent",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {log.message}
                  </p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground">
                      Searching with Tavily AI...
                    </p>
                  )}
                  {isDone && (
                    <p className="text-xs text-muted-foreground">Complete</p>
                  )}
                </div>

                {/* Status Badge */}
                {isDone && <Sparkles className="size-4 text-accent" />}
              </div>
            );
          })
        )}
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="text-center p-4 rounded-xl border border-accent/30 bg-accent/5 ai-glow">
          <Sparkles className="size-6 text-accent mx-auto mb-2" />
          <p className="font-medium text-foreground">Research Complete!</p>
          <p className="text-sm text-muted-foreground">
            Preparing results for review...
          </p>
        </div>
      )}

      {/* Help Text */}
      {!isComplete && displayLogs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          This may take a few moments. The AI is searching multiple sources for accurate information.
        </p>
      )}

      {/* Agent running indicator */}
      {running && !isComplete && (
        <p className="text-center text-xs text-accent animate-pulse">
          Agent is processing your request...
        </p>
      )}

      {/* Debug Info - visible in production to diagnose issues */}
      <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border space-y-1">
        <p className="text-xs font-mono text-muted-foreground">
          {debugInfo}
        </p>
        <p className="text-xs font-mono text-muted-foreground">
          Agent: {running ? "🟢 Running" : "🔴 Not running"} |
          Cache: {cacheHit ? "✅ Hit" : cacheChecked ? "❌ Miss" : "⏳ Checking"} |
          Triggered: {hasTriggered ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
}
