"use client";

import { useState, useEffect, useRef } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
import {
  Search,
  Users,
  BookOpen,
  Globe,
  Heart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SourceType, SourceResearchData } from "@/lib/types/agent-state";

interface ResearchProgressProps {
  sourceName: string;
  sourceType: SourceType;
  onComplete: (data: SourceResearchData) => void;
  onError?: (error: string) => void;
}

interface ResearchTask {
  id: string;
  label: string;
  icon: React.ElementType;
  status: "pending" | "loading" | "complete" | "error";
}

const RESEARCH_TASKS: Omit<ResearchTask, "status">[] = [
  { id: "characters", label: "Finding Characters", icon: Users },
  { id: "plot", label: "Analyzing Plot", icon: BookOpen },
  { id: "world", label: "Exploring World", icon: Globe },
  { id: "ships", label: "Discovering Ships", icon: Heart },
];

export function ResearchProgress({
  sourceName,
  sourceType,
  onComplete,
  onError,
}: ResearchProgressProps) {
  const [tasks, setTasks] = useState<ResearchTask[]>(
    RESEARCH_TASKS.map((t) => ({ ...t, status: "pending" as const }))
  );
  const [overallProgress, setOverallProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedRef = useRef(false);

  // Get CopilotChat to send messages to the agent
  const { appendMessage, visibleMessages, isLoading } = useCopilotChat();

  // Calculate progress
  useEffect(() => {
    const completedTasks = tasks.filter((t) => t.status === "complete").length;
    setOverallProgress((completedTasks / tasks.length) * 100);
    setIsComplete(completedTasks === tasks.length);
  }, [tasks]);

  // Start research by sending a message to the agent
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Set all tasks to loading initially
    setTasks((prev) =>
      prev.map((t, i) =>
        i === 0 ? { ...t, status: "loading" as const } : t
      )
    );

    // Send research request to the agent
    const researchPrompt = `Please research "${sourceName}" (${sourceType}) for fanfiction writing.

Use the research_source_materials tool to search for:
1. Characters - main characters, their personalities and traits
2. Plot - the original story plot and key events
3. World - the world setting and lore
4. Ships - popular fan pairings and relationships

After gathering all results, use the aggregate_research tool to compile everything into a structured format.

This is for the Creative Wizard - I need comprehensive research data to help write a fanfiction story.`;

    appendMessage({
      id: `research-${Date.now()}`,
      role: "user",
      content: researchPrompt,
    });
  }, [sourceName, sourceType, appendMessage]);

  // Monitor agent messages for research progress
  useEffect(() => {
    if (visibleMessages.length === 0) return;

    const lastMessage = visibleMessages[visibleMessages.length - 1];

    // Check if this is an assistant message with research results
    if (lastMessage.role === "assistant" && typeof lastMessage.content === "string") {
      const content = lastMessage.content.toLowerCase();

      // Update task status based on message content
      if (content.includes("character") || content.includes("找到角色") || content.includes("characters found")) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === "characters" ? { ...t, status: "complete" as const } :
            t.id === "plot" && t.status === "pending" ? { ...t, status: "loading" as const } : t
          )
        );
      }
      if (content.includes("plot") || content.includes("剧情") || content.includes("story")) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === "plot" ? { ...t, status: "complete" as const } :
            t.id === "world" && t.status === "pending" ? { ...t, status: "loading" as const } : t
          )
        );
      }
      if (content.includes("world") || content.includes("setting") || content.includes("世界观")) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === "world" ? { ...t, status: "complete" as const } :
            t.id === "ships" && t.status === "pending" ? { ...t, status: "loading" as const } : t
          )
        );
      }
      if (content.includes("ship") || content.includes("pairing") || content.includes("配对")) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === "ships" ? { ...t, status: "complete" as const } : t
          )
        );
      }

      // Try to parse research data from the message
      try {
        // Look for JSON in the message
        const jsonMatch = lastMessage.content.match(/\{[\s\S]*"originalPlot"[\s\S]*\}/);
        if (jsonMatch) {
          const researchData = JSON.parse(jsonMatch[0]) as SourceResearchData;

          // Mark all tasks as complete
          setTasks((prev) =>
            prev.map((t) => ({ ...t, status: "complete" as const }))
          );

          // Small delay to show completion animation
          setTimeout(() => {
            onComplete(researchData);
          }, 1000);
          return;
        }

        // Alternative: Check if message contains structured research info
        if (
          content.includes("research complete") ||
          content.includes("研究完成") ||
          (content.includes("maincharacters") && content.includes("originalplot"))
        ) {
          // Try to extract research data from the full message
          const extractedData = extractResearchData(lastMessage.content, sourceName);
          if (extractedData) {
            setTasks((prev) =>
              prev.map((t) => ({ ...t, status: "complete" as const }))
            );
            setTimeout(() => {
              onComplete(extractedData);
            }, 1000);
          }
        }
      } catch {
        // Continue waiting for more messages
      }
    }
  }, [visibleMessages, sourceName, onComplete]);

  // Simulate progress for visual feedback while agent is working
  useEffect(() => {
    if (!isLoading || isComplete) return;

    const interval = setInterval(() => {
      setTasks((prev) => {
        const loadingIndex = prev.findIndex((t) => t.status === "loading");
        const nextPendingIndex = prev.findIndex((t) => t.status === "pending");

        // If a task has been loading for a while, mark it complete and move to next
        if (loadingIndex !== -1 && Math.random() > 0.7) {
          return prev.map((t, i) => {
            if (i === loadingIndex) return { ...t, status: "complete" as const };
            if (i === nextPendingIndex) return { ...t, status: "loading" as const };
            return t;
          });
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoading, isComplete]);

  // Handle timeout - if research takes too long, show error
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isComplete && !errorMessage) {
        // If still not complete after 60 seconds, check if we have any useful data
        const hasProgress = tasks.some((t) => t.status === "complete");
        if (!hasProgress) {
          setErrorMessage("Research is taking longer than expected. Please try again.");
          onError?.("Research timeout");
        }
      }
    }, 60000);

    return () => clearTimeout(timeout);
  }, [isComplete, errorMessage, tasks, onError]);

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

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          const taskIsLoading = task.status === "loading";
          const taskIsComplete = task.status === "complete";
          const isPending = task.status === "pending";
          const isError = task.status === "error";

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all",
                taskIsComplete && "border-primary/30 bg-primary/5",
                taskIsLoading && "border-accent/30 bg-accent/5 ai-glow",
                isPending && "border-border bg-surface",
                isError && "border-destructive/30 bg-destructive/5"
              )}
            >
              {/* Status Icon */}
              <div
                className={cn(
                  "flex items-center justify-center size-10 rounded-lg",
                  taskIsComplete && "bg-primary/15 text-primary",
                  taskIsLoading && "bg-accent/15 text-accent",
                  isPending && "bg-muted text-muted-foreground",
                  isError && "bg-destructive/15 text-destructive"
                )}
              >
                {taskIsLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : taskIsComplete ? (
                  <CheckCircle2 className="size-5" />
                ) : isError ? (
                  <AlertCircle className="size-5" />
                ) : (
                  <Icon className="size-5" />
                )}
              </div>

              {/* Task Label */}
              <div className="flex-1">
                <p
                  className={cn(
                    "font-medium",
                    taskIsComplete && "text-foreground",
                    taskIsLoading && "text-accent",
                    isPending && "text-muted-foreground",
                    isError && "text-destructive"
                  )}
                >
                  {task.label}
                </p>
                {taskIsLoading && (
                  <p className="text-xs text-muted-foreground">
                    Searching with Tavily AI...
                  </p>
                )}
                {taskIsComplete && (
                  <p className="text-xs text-muted-foreground">Complete</p>
                )}
              </div>

              {/* Status Badge */}
              {taskIsComplete && (
                <Sparkles className="size-4 text-accent" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="text-center p-4 rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertCircle className="size-6 text-destructive mx-auto mb-2" />
          <p className="font-medium text-destructive">{errorMessage}</p>
        </div>
      )}

      {/* Completion Message */}
      {isComplete && !errorMessage && (
        <div className="text-center p-4 rounded-xl border border-accent/30 bg-accent/5 ai-glow">
          <Sparkles className="size-6 text-accent mx-auto mb-2" />
          <p className="font-medium text-foreground">Research Complete!</p>
          <p className="text-sm text-muted-foreground">
            Preparing results for review...
          </p>
        </div>
      )}

      {/* Help Text */}
      {!isComplete && !errorMessage && (
        <p className="text-center text-xs text-muted-foreground">
          This may take a few moments. The AI is searching multiple sources for accurate information.
        </p>
      )}
    </div>
  );
}

/**
 * Extract research data from agent message content
 */
function extractResearchData(content: string, sourceName: string): SourceResearchData | null {
  try {
    // Try to find JSON block first
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                     content.match(/\{[\s\S]*"originalPlot"[\s\S]*"mainCharacters"[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr) as SourceResearchData;
    }

    // If no JSON found, return null - let the agent continue
    return null;
  } catch {
    return null;
  }
}
