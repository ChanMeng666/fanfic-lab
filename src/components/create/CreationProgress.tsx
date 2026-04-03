"use client";

import { Sparkles, Check, Loader2, AlertCircle } from "lucide-react";
import type { DreamWriterStage } from "@/lib/types/dreamwriter";

interface CreationProgressProps {
  stage: DreamWriterStage;
  message: string | null;
}

const STAGES: { key: DreamWriterStage; label: string }[] = [
  { key: "parsing", label: "理解创作需求" },
  { key: "planning", label: "构思故事结构" },
  { key: "writing", label: "执笔写作" },
  { key: "checking", label: "质量检查" },
  { key: "complete", label: "创作完成" },
];

const STAGE_ORDER: Record<DreamWriterStage, number> = {
  idle: -1,
  parsing: 0,
  planning: 1,
  writing: 2,
  revising: 2, // Same visual level as writing
  checking: 3,
  complete: 4,
  error: -1,
};

export function CreationProgress({ stage, message }: CreationProgressProps) {
  const currentIndex = STAGE_ORDER[stage];

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {STAGES.map((s, i) => {
        const isDone = currentIndex > i;
        const isActive = currentIndex === i;
        const isPending = currentIndex < i;

        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center size-6 rounded-full transition-colors ${
                isDone
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "bg-accent/20 text-accent"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? (
                <Check className="size-3.5" />
              ) : isActive ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <span className="size-2 rounded-full bg-current opacity-30" />
              )}
            </div>
            <span
              className={`text-sm ${
                isDone
                  ? "text-foreground"
                  : isActive
                    ? "text-accent font-medium"
                    : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}

      {message && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {stage === "error" ? (
            <span className="flex items-center justify-center gap-1.5 text-destructive">
              <AlertCircle className="size-3.5" />
              {message}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" />
              {message}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
