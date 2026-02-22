"use client";

import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FandomInput } from "./FandomInput";
import { CPMenu } from "./CPMenu";
import { ThemeMenu } from "./ThemeMenu";
import { ConstraintPanel } from "./ConstraintPanel";
import { ConfirmationCard } from "./ConfirmationCard";
import { PipelineProgress } from "./PipelineProgress";
import { PlanApproval } from "./PlanApproval";
import { StoryReader } from "@/components/reader/StoryReader";
import { useStoryGenerator } from "@/lib/hooks/useStoryGenerator";
import type { StoryRequest, WritingPlan } from "@/lib/types/agent-state";

type Step = "fandom" | "select" | "confirm" | "generating" | "complete";

interface CPOption {
  names: string[];
  description: string;
}

interface ThemeOption {
  name: string;
  description: string;
}

export function QuickGenerator() {
  const [step, setStep] = useState<Step>("fandom");
  const [fandom, setFandom] = useState("");
  const [cpOptions, setCpOptions] = useState<CPOption[]>([]);
  const [themeOptions, setThemeOptions] = useState<ThemeOption[]>([]);
  const [selectedCP, setSelectedCP] = useState<string[]>([]);
  const [selectedTheme, setSelectedTheme] = useState("");
  const [constraints, setConstraints] = useState<{
    length: "short" | "medium" | "long";
    rating: string;
    ending: "happy" | "sad" | "open";
    pov: "first" | "third";
    language: "en" | "zh";
  }>({
    length: "medium",
    rating: "General",
    ending: "happy",
    pov: "third",
    language: "en",
  });

  const {
    stage,
    plan,
    deliverable,
    error,
    startGeneration,
    approvePlan,
    rejectPlan,
    reset,
  } = useStoryGenerator();

  // Step 1: Fandom selected
  const handleFandomSelect = useCallback(async (selectedFandom: string) => {
    setFandom(selectedFandom);

    // For now, generate some default CP and theme options
    // In production, this would call the intake + research nodes
    // and get real suggestions back
    setCpOptions([
      { names: ["Character A", "Character B"], description: "Popular pairing" },
    ]);
    setThemeOptions([
      { name: "Enemies to Lovers", description: "Classic rivalry turns to romance" },
      { name: "Coffee Shop AU", description: "Modern alternate universe" },
      { name: "Canon Divergence", description: "What if things went differently?" },
      { name: "Hurt/Comfort", description: "Emotional healing and support" },
      { name: "Fake Dating", description: "Pretend relationship becomes real" },
      { name: "School AU", description: "Academic alternate universe" },
    ]);
    setStep("select");
  }, []);

  // Step 2: CP selected
  const handleCPSelect = useCallback((cp: string[]) => {
    setSelectedCP(cp);
  }, []);

  // Step 2: Theme selected
  const handleThemeSelect = useCallback((theme: string) => {
    setSelectedTheme(theme);
    // Auto-advance to confirm if CP is also selected
    if (selectedCP.length > 0) {
      setStep("confirm");
    }
  }, [selectedCP]);

  // Effect: if both CP and theme selected, go to confirm
  const handleConfirmReady = useCallback(() => {
    if (selectedCP.length > 0 && selectedTheme) {
      setStep("confirm");
    }
  }, [selectedCP, selectedTheme]);

  // Step 3: Confirm and generate
  const handleConfirm = useCallback(async () => {
    const request: StoryRequest = {
      fandom,
      cp: selectedCP,
      theme: selectedTheme,
      setting: "",
      constraints,
    };
    setStep("generating");
    await startGeneration(request);
  }, [fandom, selectedCP, selectedTheme, constraints, startGeneration]);

  // Handle plan approval
  const handleApprovePlan = useCallback(async () => {
    await approvePlan();
  }, [approvePlan]);

  // Handle plan rejection
  const handleRejectPlan = useCallback(async () => {
    await rejectPlan();
  }, [rejectPlan]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    switch (step) {
      case "select":
        setStep("fandom");
        setFandom("");
        break;
      case "confirm":
        setStep("select");
        break;
      default:
        break;
    }
  }, [step]);

  // Handle restart
  const handleRestart = useCallback(() => {
    reset();
    setStep("fandom");
    setFandom("");
    setSelectedCP([]);
    setSelectedTheme("");
  }, [reset]);

  // If generation is complete, show the story
  if (stage === "complete" && deliverable) {
    return (
      <StoryReader
        deliverable={deliverable}
        onRestart={handleRestart}
        onContinue={(hook) => {
          // Use the hook as a new theme/prompt for continuation
          setSelectedTheme(hook);
          setStep("confirm");
        }}
      />
    );
  }

  // If generating, show progress + plan approval
  if (step === "generating") {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-slide-in">
        <PipelineProgress stage={stage} />

        {stage === "hitl_wait" && plan && (
          <PlanApproval
            plan={plan}
            onApprove={handleApprovePlan}
            onReject={handleRejectPlan}
          />
        )}

        {error && (
          <div className="text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={handleRestart}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      {step !== "fandom" && (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
      )}

      {/* Step 1: Fandom Input */}
      {step === "fandom" && (
        <FandomInput onSelect={handleFandomSelect} />
      )}

      {/* Step 2: CP + Theme Selection */}
      {step === "select" && (
        <div className="space-y-8">
          <CPMenu
            options={cpOptions}
            onSelect={handleCPSelect}
          />
          <ThemeMenu
            options={themeOptions}
            onSelect={handleThemeSelect}
          />
          <ConstraintPanel
            constraints={constraints}
            onChange={setConstraints}
          />
          {selectedCP.length > 0 && selectedTheme && (
            <div className="flex justify-center">
              <Button onClick={handleConfirmReady} className="gap-1.5">
                Continue
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === "confirm" && (
        <ConfirmationCard
          request={{
            fandom,
            cp: selectedCP,
            theme: selectedTheme,
            setting: "",
            constraints,
          }}
          onConfirm={handleConfirm}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
