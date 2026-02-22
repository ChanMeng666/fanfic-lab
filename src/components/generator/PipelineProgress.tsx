"use client";

import { Check, Loader2 } from "lucide-react";
import type { PipelineStage } from "@/lib/types/agent-state";

interface PipelineProgressProps {
  stage: PipelineStage;
}

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "intake", label: "Understanding request" },
  { key: "research", label: "Researching fandom" },
  { key: "planning", label: "Creating writing plan" },
  { key: "hitl_wait", label: "Awaiting your approval" },
  { key: "writing", label: "Writing story" },
  { key: "polishing", label: "Polishing prose" },
  { key: "delivery", label: "Preparing delivery" },
];

const STAGE_ORDER: PipelineStage[] = STAGES.map((s) => s.key);

function getStageIndex(stage: PipelineStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 ? idx : -1;
}

export function PipelineProgress({ stage }: PipelineProgressProps) {
  const currentIndex = getStageIndex(stage);
  const isComplete = stage === "complete";
  const isError = stage === "error";

  return (
    <div className="w-full max-w-md mx-auto space-y-3 animate-fade-slide-in">
      {STAGES.map((s, i) => {
        const isDone = isComplete || i < currentIndex;
        const isActive = i === currentIndex && !isComplete;

        return (
          <div
            key={s.key}
            className={`flex items-center gap-3 transition-all duration-300 ${
              isDone
                ? "opacity-100"
                : isActive
                  ? "opacity-100"
                  : "opacity-40"
            }`}
          >
            {/* Status icon */}
            <div
              className={`flex items-center justify-center size-6 rounded-full transition-all ${
                isDone
                  ? "bg-success text-primary-foreground"
                  : isActive
                    ? "bg-accent text-accent-foreground animate-ai-pulse"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? (
                <Check className="size-3.5" />
              ) : isActive ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <span className="text-xs">{i + 1}</span>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-sm ${
                isDone
                  ? "text-muted-foreground line-through"
                  : isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}

      {isError && (
        <div className="text-sm text-destructive mt-2">
          An error occurred. Please try again.
        </div>
      )}
    </div>
  );
}
