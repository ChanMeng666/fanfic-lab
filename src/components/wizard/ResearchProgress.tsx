"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, MessageRole } from "@copilotkit/runtime-client-gql";
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
  const hasReceivedDataRef = useRef(false);
  const hasTriggeredRef = useRef(false);

  // Get CopilotChat to trigger research
  const { appendMessage } = useCopilotChat();

  // Trigger agent to start research
  useEffect(() => {
    if (hasTriggeredRef.current || !sourceName) return;
    hasTriggeredRef.current = true;

    // Send message to trigger agent research
    const triggerResearch = async () => {
      try {
        await appendMessage(
          new TextMessage({
            role: MessageRole.User,
            content: `Please research "${sourceName}" (${sourceType}) for fanfiction writing. Use the research_source_materials tool for characters, plot, world, and ships. Then use aggregate_research to compile results, and finally call the deliver_research_results action to send the data to me.`,
          })
        );
      } catch (error) {
        console.error("Failed to trigger research:", error);
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(triggerResearch, 500);
    return () => clearTimeout(timer);
  }, [sourceName, sourceType, appendMessage]);

  // Calculate progress
  useEffect(() => {
    const completedTasks = tasks.filter((t) => t.status === "complete").length;
    setOverallProgress((completedTasks / tasks.length) * 100);
    setIsComplete(completedTasks === tasks.length);
  }, [tasks]);

  // Handle research completion from agent
  const handleResearchData = useCallback((data: SourceResearchData) => {
    if (hasReceivedDataRef.current) return;
    hasReceivedDataRef.current = true;

    // Mark all tasks as complete
    setTasks((prev) =>
      prev.map((t) => ({ ...t, status: "complete" as const }))
    );

    // Small delay to show completion animation
    setTimeout(() => {
      onComplete(data);
    }, 1000);
  }, [onComplete]);

  // Register action to receive research results from agent
  useCopilotAction({
    name: "deliver_research_results",
    description: "Deliver the compiled research results to the wizard UI",
    parameters: [
      {
        name: "originalPlot",
        type: "string",
        description: "Summary of the original plot",
        required: true,
      },
      {
        name: "mainCharacters",
        type: "object[]",
        description: "Array of main characters with name, description, traits, relationships",
        required: true,
      },
      {
        name: "worldSettings",
        type: "string",
        description: "Description of the world and setting",
        required: true,
      },
      {
        name: "popularShips",
        type: "string[]",
        description: "Array of popular ship names",
        required: true,
      },
      {
        name: "canonRelationships",
        type: "string[]",
        description: "Array of canon relationships",
        required: true,
      },
      {
        name: "searchSources",
        type: "string[]",
        description: "Array of source URLs",
        required: true,
      },
    ],
    handler: async (args) => {
      const researchData: SourceResearchData = {
        originalPlot: args.originalPlot as string,
        mainCharacters: (args.mainCharacters as Array<{
          name: string;
          description: string;
          traits: string[];
          relationships?: string[];
        }>) || [],
        worldSettings: args.worldSettings as string,
        popularShips: (args.popularShips as string[]) || [],
        canonRelationships: (args.canonRelationships as string[]) || [],
        searchSources: (args.searchSources as string[]) || [],
      };
      handleResearchData(researchData);
      return "Research results delivered successfully";
    },
  });

  // Simulate progress for visual feedback
  useEffect(() => {
    if (isComplete || hasReceivedDataRef.current) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex >= tasks.length) {
        clearInterval(interval);
        return;
      }

      setTasks((prev) =>
        prev.map((t, i) => {
          if (i < currentIndex) return { ...t, status: "complete" as const };
          if (i === currentIndex) return { ...t, status: "loading" as const };
          return t;
        })
      );

      currentIndex++;
    }, 3000);

    return () => clearInterval(interval);
  }, [tasks.length, isComplete]);

  // Handle timeout - provide fallback data if agent doesn't respond
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!hasReceivedDataRef.current && !errorMessage) {
        console.log("Research timeout - using fallback search approach");

        // Provide fallback research data based on source name
        const fallbackData: SourceResearchData = {
          originalPlot: `Research data for ${sourceName} is being compiled. The AI searched for information about this ${sourceType} but couldn't retrieve complete results in time. You can proceed with the characters you know, or try regenerating the research.`,
          mainCharacters: [
            {
              name: "Main Character",
              description: `A primary character from ${sourceName}`,
              traits: ["determined", "complex", "memorable"],
              relationships: [],
            },
          ],
          worldSettings: `The world of ${sourceName} - a ${sourceType} with its unique setting and atmosphere.`,
          popularShips: [],
          canonRelationships: [],
          searchSources: [],
        };

        handleResearchData(fallbackData);
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, [sourceName, sourceType, errorMessage, handleResearchData]);

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
