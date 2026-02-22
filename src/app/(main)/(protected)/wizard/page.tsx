"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Wizard components
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { SourceSelector } from "@/components/wizard/SourceSelector";
import { StoryConfigurator } from "@/components/wizard/StoryConfigurator";
import { ResearchProgress } from "@/components/wizard/ResearchProgress";
import { ResearchResultsCard } from "@/components/wizard/ResearchResultsCard";
import { CharacterSetupV2 } from "@/components/wizard/CharacterSetupV2";
import { InlineWritingArea } from "@/components/wizard/InlineWritingArea";

// Types and actions
import type {
  WizardSession,
  WizardStep,
  SourceType,
  ShipType,
  StorySetting,
  SourceResearchData,
  StoryCharacter,
} from "@/lib/types/agent-state";
import { INITIAL_WIZARD_SESSION } from "@/lib/types/agent-state";
import { saveDraft, saveWizardProgress, loadWizardProgress } from "@/lib/actions/user";

export default function WizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<WizardSession>(INITIAL_WIZARD_SESSION);
  const [mode, setMode] = useState<"setup" | "research" | "writing">("setup");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchComplete, setResearchComplete] = useState(false);

  // Debug: Track mode and session changes
  useEffect(() => {
    console.log("[Wizard] MODE CHANGED:", mode);
  }, [mode]);

  useEffect(() => {
    console.log("[Wizard] SESSION STEP CHANGED:", session.step);
  }, [session.step]);

  // Load draft from URL parameter if present
  useEffect(() => {
    const draftIdParam = searchParams.get("draftId");
    if (draftIdParam && !draftId) {
      const loadDraft = async () => {
        const wizardSession = await loadWizardProgress(draftIdParam);
        if (wizardSession) {
          setDraftId(draftIdParam);
          setSession(wizardSession);
          // Set mode based on saved step
          if (wizardSession.step === "complete") {
            setMode("writing");
          } else if (["research", "characters", "outline"].includes(wizardSession.step)) {
            setMode("research");
            setResearchComplete(wizardSession.step !== "research");
          }
        }
      };
      loadDraft();
    }
  }, [searchParams, draftId]);

  // Auto-save wizard progress
  const saveProgress = useCallback(
    async (step: WizardStep, sessionData: Partial<WizardSession>) => {
      setIsSaving(true);
      try {
        const draft = await saveWizardProgress({
          draftId: draftId || undefined,
          step,
          sessionData: { ...session, ...sessionData },
        });
        if (!draftId) {
          setDraftId(draft.id);
        }
        setLastSaved(new Date());
      } catch (error) {
        console.error("Failed to save wizard progress:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [draftId, session]
  );

  // Handle content save in writing mode
  const handleSaveContent = useCallback(
    async (newContent: string) => {
      if (!draftId) return;
      setIsSaving(true);
      try {
        await saveDraft({
          id: draftId,
          content: newContent,
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error("Failed to save draft:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [draftId]
  );

  // Step 1: Source Selection Handler
  const handleSourceComplete = async (data: { sourceType: SourceType; sourceName: string }) => {
    const newSession = {
      ...session,
      sourceType: data.sourceType,
      sourceName: data.sourceName,
      step: "config" as WizardStep,
    };
    setSession(newSession);
    await saveProgress("config", { sourceType: data.sourceType, sourceName: data.sourceName });
  };

  // Step 2: Story Configuration Handler
  const handleConfigComplete = async (data: {
    shipType: ShipType;
    setting: StorySetting;
    additionalTags: string[];
  }) => {
    const newSession = {
      ...session,
      shipType: data.shipType,
      setting: data.setting,
      additionalTags: data.additionalTags,
      step: "research" as WizardStep,
    };
    setSession(newSession);
    setIsResearching(true);
    setMode("research");
    await saveProgress("research", {
      shipType: data.shipType,
      setting: data.setting,
      additionalTags: data.additionalTags
    });
  };

  // Step 3: Research Complete Handler
  const handleResearchComplete = (data: SourceResearchData) => {
    setSession((prev) => ({
      ...prev,
      researchData: data,
    }));
    setIsResearching(false);
    setResearchComplete(true);
  };

  // Step 3: Research Approved Handler
  const handleResearchApproved = async () => {
    const newSession = {
      ...session,
      step: "characters" as WizardStep,
    };
    setSession(newSession);
    setResearchComplete(false);
    setMode("setup");
    await saveProgress("characters", { researchData: session.researchData });
  };

  // Step 3: Research Regenerate Handler
  const handleResearchRegenerate = () => {
    setResearchComplete(false);
    setIsResearching(true);
  };

  // Step 4: Characters Complete Handler
  const handleCharactersComplete = async (characters: StoryCharacter[]) => {
    const newSession = {
      ...session,
      characters,
      step: "outline" as WizardStep,
    };
    setSession(newSession);
    await saveProgress("outline", { characters });
  };

  // Step 5: Outline Approved Handler
  const handleOutlineApproved = async (finalOutline: string) => {
    console.log("[Wizard] handleOutlineApproved called");
    console.log("[Wizard] Outline length:", finalOutline?.length || 0);
    console.log("[Wizard] Call stack:", new Error().stack);

    setSession((prev) => ({
      ...prev,
      outline: finalOutline,
      step: "complete" as WizardStep,
    }));

    try {
      // Save final draft
      const draft = await saveDraft({
        id: draftId || undefined,
        title: `${session.sourceName} Story`,
        content: "",
        fandom: session.sourceName || undefined,
        ships: session.shipType ? [session.shipType] : [],
        tags: session.additionalTags,
        aiContext: {
          characters: session.characters,
          outline: finalOutline,
          setting: session.setting,
          researchData: session.researchData,
        },
      });

      setDraftId(draft.id);
      setLastSaved(new Date());
      setMode("writing");
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  };

  // Back navigation handler
  const handleBack = () => {
    const stepOrder: WizardStep[] = ["source", "config", "research", "characters", "outline", "complete"];
    const currentIndex = stepOrder.indexOf(session.step);
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      setSession((prev) => ({ ...prev, step: prevStep }));
      if (prevStep === "research") {
        setMode("research");
        setResearchComplete(true);
      } else {
        setMode("setup");
      }
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (session.step) {
      case "source":
        return <SourceSelector onComplete={handleSourceComplete} />;

      case "config":
        return (
          <StoryConfigurator
            sourceName={session.sourceName || ""}
            sourceType={session.sourceType || "anime"}
            onComplete={handleConfigComplete}
            onBack={handleBack}
          />
        );

      case "research":
        if (isResearching) {
          return (
            <ResearchProgress
              sourceName={session.sourceName || ""}
              sourceType={session.sourceType || "anime"}
              onComplete={handleResearchComplete}
            />
          );
        }
        if (researchComplete && session.researchData) {
          return (
            <ResearchResultsCard
              sourceName={session.sourceName || ""}
              data={session.researchData}
              onApprove={handleResearchApproved}
              onRegenerate={handleResearchRegenerate}
            />
          );
        }
        return null;

      case "characters":
        if (!session.researchData) {
          // Fallback if no research data
          return (
            <div className="text-center p-8">
              <p className="text-muted-foreground">No research data available.</p>
              <Button onClick={handleBack} className="mt-4">
                Go Back
              </Button>
            </div>
          );
        }
        return (
          <CharacterSetupV2
            sourceName={session.sourceName || ""}
            researchData={session.researchData}
            onComplete={handleCharactersComplete}
            onBack={handleBack}
          />
        );

      case "outline":
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="flex items-center justify-center size-12 rounded-xl bg-accent/15 text-accent">
              <Sparkles className="size-6" />
            </div>
            <h2 className="font-display text-2xl font-semibold">Generate Your Outline</h2>
            <p className="text-muted-foreground text-center max-w-md">
              For the best AI-powered story generation experience, try our new Quick Generate mode.
            </p>
            <div className="flex gap-3">
              <Link href="/generate">
                <Button className="gap-1.5">
                  <Sparkles className="size-4" />
                  Quick Generate
                </Button>
              </Link>
              <Button variant="outline" onClick={() => {
                handleOutlineApproved("User chose to write freely without an outline.");
              }}>
                Skip to Writing
              </Button>
            </div>
          </div>
        );

      case "complete":
        // Should transition to writing mode
        return null;

      default:
        return null;
    }
  };

  // Writing mode layout
  if (mode === "writing") {
    return (
      <div className="h-screen flex flex-col">
        {/* Writing Mode Header */}
        <header className="h-12 border-b border-border/50 flex items-center px-4 gap-3 flex-shrink-0 bg-surface/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{session.sourceName}</span>
            {session.shipType && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground uppercase">{session.shipType}</span>
              </>
            )}
            {session.setting && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{session.setting}</span>
              </>
            )}
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <div className="animate-spin size-3 border-2 border-primary border-t-transparent rounded-full" />
                Saving...
              </span>
            ) : lastSaved ? (
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            ) : null}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <InlineWritingArea
            draftId={draftId}
            storyContext={{
              fandom: session.sourceName || "",
              ships: session.shipType ? [session.shipType] : [],
              characters: session.characters,
              tone: session.setting || "modern",
              outline: session.outline,
            }}
            content={content}
            onContentChange={(newContent) => {
              setContent(newContent);
              handleSaveContent(newContent);
            }}
          />
        </div>

      </div>
    );
  }

  // Research mode with progress display
  if (mode === "research") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Progress indicator */}
        <div className="bg-background">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <WizardProgress currentStep={session.step} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-4">
          {renderStepContent()}
        </div>

        {/* Save indicator */}
        {lastSaved && (
          <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-surface/90 px-3 py-2 rounded-lg border border-border backdrop-blur-sm">
            {isSaving ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString()}`}
          </div>
        )}
      </div>
    );
  }

  // Setup mode with step-based wizard
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Progress indicator - only show after first step */}
      {session.step !== "source" && (
        <div className="bg-background">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <WizardProgress currentStep={session.step} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex">
        {session.step === "outline" ? (
          // Full-screen chat for outline generation
          renderStepContent()
        ) : (
          // Centered content for other steps
          <div className="flex-1 flex items-center justify-center p-4">
            {renderStepContent()}
          </div>
        )}
      </div>

      {/* Save indicator */}
      {lastSaved && session.step !== "source" && (
        <div className="fixed bottom-4 right-4 text-xs text-muted-foreground bg-surface/90 px-3 py-2 rounded-lg border border-border backdrop-blur-sm">
          {isSaving ? "Saving..." : `Saved ${lastSaved.toLocaleTimeString()}`}
        </div>
      )}
    </div>
  );
}
