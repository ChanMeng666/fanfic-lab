"use client";

/**
 * Research Progress Component
 * Displays real-time progress from agent state via useCoAgentStateRender
 *
 * Pattern based on open-research-ANA example:
 * - Uses useCoAgentStateRender to render logs from agent state
 * - Uses useCopilotChat to trigger research via message
 * - Agent updates state.logs during research, which triggers re-render
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useCoAgentStateRender, useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
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

export function ResearchProgress({
  sourceName,
  sourceType,
  onComplete,
  onError,
}: ResearchProgressProps) {
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const hasTriggeredRef = useRef(false);
  const hasCompletedRef = useRef(false);

  // Get CopilotChat to trigger research
  const { appendMessage } = useCopilotChat();

  // Render agent logs via useCoAgentStateRender
  // This is the key pattern from open-research-ANA
  useCoAgentStateRender<FanficAgentState>({
    name: "fanfic_agent",
    render: ({ state }) => {
      // Update logs from agent state
      if (state.logs && state.logs.length > 0) {
        setLogs(state.logs);
      }

      // Check if research is complete (all logs done)
      const allDone = state.logs?.length > 0 && state.logs.every((log) => log.done);
      if (allDone && !hasCompletedRef.current) {
        // Check if we have research data
        if (state.wizardSession?.researchData) {
          hasCompletedRef.current = true;
          setIsComplete(true);
          // Small delay to show completion animation
          setTimeout(() => {
            onComplete(state.wizardSession!.researchData!);
          }, 1000);
        }
      }

      // Return null - we handle rendering ourselves
      return null;
    },
  });

  // Calculate progress from logs
  useEffect(() => {
    if (logs.length === 0) {
      setOverallProgress(0);
      return;
    }
    const completedCount = logs.filter((log) => log.done).length;
    const progress = (completedCount / logs.length) * 100;
    setOverallProgress(progress);
  }, [logs]);

  // Trigger agent to start research
  useEffect(() => {
    if (hasTriggeredRef.current || !sourceName) return;
    hasTriggeredRef.current = true;

    const triggerResearch = async () => {
      try {
        await appendMessage(
          new TextMessage({
            role: MessageRole.User,
            content: `Please use the research_source_materials tool to research "${sourceName}" (${sourceType}) for fanfiction writing. Search for characters, plot, world settings, and popular ships.`,
          })
        );
      } catch (error) {
        console.error("Failed to trigger research:", error);
        onError?.("Failed to start research. Please try again.");
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(triggerResearch, 500);
    return () => clearTimeout(timer);
  }, [sourceName, sourceType, appendMessage, onError]);

  // Timeout fallback - if no response in 60 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasCompletedRef.current && logs.length === 0) {
        console.log("Research timeout - no logs received");
        onError?.("Research timed out. The AI agent may be unavailable. Please try again.");
      }
    }, 60000);

    return () => clearTimeout(timeout);
  }, [logs.length, onError]);

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

      {/* Log List - Similar to open-research-ANA Progress component */}
      <div className="space-y-3">
        {logs.length === 0 ? (
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
          logs.map((log, index) => {
            const isDone = log.done;
            const isActive = !isDone && index === logs.findIndex((l) => !l.done);
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
      {!isComplete && logs.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          This may take a few moments. The AI is searching multiple sources for accurate information.
        </p>
      )}
    </div>
  );
}
