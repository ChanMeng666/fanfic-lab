"use client";

import { cn } from "@/lib/utils";
import {
  Library,
  Settings,
  Search,
  Users,
  FileText,
  PenLine,
  Check,
} from "lucide-react";
import type { WizardStep } from "@/lib/types/agent-state";

interface WizardProgressProps {
  currentStep: WizardStep;
  className?: string;
}

interface StepConfig {
  id: WizardStep;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}

const STEPS: StepConfig[] = [
  { id: "source", label: "Select Source", shortLabel: "Source", icon: Library },
  { id: "config", label: "Configure Story", shortLabel: "Config", icon: Settings },
  { id: "research", label: "AI Research", shortLabel: "Research", icon: Search },
  { id: "characters", label: "Characters", shortLabel: "Characters", icon: Users },
  { id: "outline", label: "Story Outline", shortLabel: "Outline", icon: FileText },
  { id: "complete", label: "Start Writing", shortLabel: "Write", icon: PenLine },
];

const STEP_ORDER: WizardStep[] = [
  "source",
  "config",
  "research",
  "characters",
  "outline",
  "complete",
];

function getStepIndex(step: WizardStep): number {
  return STEP_ORDER.indexOf(step);
}

export function WizardProgress({ currentStep, className }: WizardProgressProps) {
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className={cn("w-full px-4 py-3 bg-background", className)}>
      <div className="max-w-4xl mx-auto">
        {/* Desktop view */}
        <div className="hidden md:flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                {/* Step indicator */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex items-center justify-center size-10 rounded-xl transition-all",
                      isCompleted && "bg-primary text-primary-foreground",
                      isCurrent && "bg-primary/15 text-primary ring-2 ring-primary/30",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-5" />
                    ) : (
                      <Icon className="size-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && "text-foreground",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-3 transition-colors",
                      index < currentIndex ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile view - compact */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {STEPS[currentIndex]?.label || "Getting Started"}
            </span>
            <span className="text-xs text-muted-foreground">
              Step {currentIndex + 1} of {STEPS.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          {/* Step icons row */}
          <div className="flex items-center justify-between mt-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center justify-center size-7 rounded-lg transition-all",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/15 text-primary",
                    !isCompleted && !isCurrent && "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export { STEPS, STEP_ORDER, getStepIndex };
