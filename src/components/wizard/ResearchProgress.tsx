"use client";

/**
 * Research Progress Component
 * Displays progress and polls agent state for completion
 *
 * Note: Due to langgraphjs dev background mode limitations,
 * real-time state streaming via copilotkitEmitState doesn't work.
 * Instead, we poll the agent state via useCoAgent to detect completion.
 */

import { useState, useEffect, useRef } from "react";
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

// Static progress steps for visual feedback
const RESEARCH_STEPS = [
  { message: "🌐 Searching for characters and personalities...", delay: 0 },
  { message: "📚 Researching plot and story elements...", delay: 2000 },
  { message: "🌍 Exploring world settings and lore...", delay: 4000 },
  { message: "💕 Finding popular ships and relationships...", delay: 6000 },
  { message: "✨ Compiling research results...", delay: 8000 },
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
  const [currentStep, setCurrentStep] = useState(0);
  const hasTriggeredRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // Get agent state via useCoAgent for polling
  const { state: agentState, running } = useCoAgent<FanficAgentState>({
    name: "fanfic_agent",
  });

  // Get CopilotChat to trigger research
  const { appendMessage } = useCopilotChat();

  // Animate progress steps for visual feedback
  useEffect(() => {
    if (hasCompletedRef.current) return;

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

        setCurrentStep(index);
        // Progress from 10% to 80% during steps
        setOverallProgress(10 + (index / RESEARCH_STEPS.length) * 70);
      }, step.delay);

      timers.push(timer);
    });

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  // Poll agent state for research completion
  useEffect(() => {
    // Check if research data is available (check for researchData object, not just characters)
    const researchData = agentState?.wizardSession?.researchData;
    const hasResearchData = researchData && (
      researchData.mainCharacters !== undefined ||
      researchData.originalPlot !== undefined ||
      researchData.worldSettings !== undefined
    );

    if (!hasCompletedRef.current && hasResearchData) {
      console.log("[ResearchProgress] Research complete!", {
        charactersFound: researchData.mainCharacters?.length || 0,
        hasPlot: !!researchData.originalPlot,
        hasWorldSettings: !!researchData.worldSettings,
        shipsFound: researchData.popularShips?.length || 0,
      });

      hasCompletedRef.current = true;

      // Mark all steps as complete
      setDisplayLogs((prev) => prev.map((log) => ({ ...log, done: true })));
      setOverallProgress(100);
      setIsComplete(true);

      // Small delay to show completion animation
      setTimeout(() => {
        onComplete(researchData);
      }, 1000);
    }
  }, [agentState, onComplete]);

  // Also check agent logs if streaming works
  useEffect(() => {
    if (agentState?.logs?.length && !hasCompletedRef.current) {
      console.log("[ResearchProgress] Received logs from agent:", agentState.logs.length);
      // Use actual logs if available (in case streaming starts working)
      if (agentState.logs.length > displayLogs.length) {
        setDisplayLogs(agentState.logs);
        const completedCount = agentState.logs.filter((log) => log.done).length;
        setOverallProgress((completedCount / agentState.logs.length) * 100);
      }
    }
  }, [agentState?.logs, displayLogs.length]);

  // Trigger agent to start research
  useEffect(() => {
    if (hasTriggeredRef.current || !sourceName) return;
    hasTriggeredRef.current = true;

    const triggerResearch = async () => {
      const messageContent = `Please use the research_source_materials tool to research "${sourceName}" (${sourceType}) for fanfiction writing. Search for characters, plot, world settings, and popular ships.`;

      console.log("[ResearchProgress] Triggering research...");
      console.log("[ResearchProgress] Source:", sourceName, sourceType);

      try {
        await appendMessage(
          new TextMessage({
            role: MessageRole.User,
            content: messageContent,
          })
        );
        console.log("[ResearchProgress] appendMessage completed successfully");
      } catch (error) {
        console.error("[ResearchProgress] Failed to trigger research:", error);
        onError?.("Failed to start research. Please try again.");
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(triggerResearch, 500);
    return () => clearTimeout(timer);
  }, [sourceName, sourceType, appendMessage, onError]);

  // Timeout fallback - if no response in 90 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.log("[ResearchProgress] Research timeout");
        onError?.("Research is taking longer than expected. The AI agent may be processing. Please wait or try again.");
      }
    }, 90000);

    return () => clearTimeout(timeout);
  }, [onError]);

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
    </div>
  );
}
