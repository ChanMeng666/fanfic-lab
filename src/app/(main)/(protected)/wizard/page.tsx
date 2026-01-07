"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat, CopilotPopup } from "@copilotkit/react-ui";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Wizard components
import { WizardProgress } from "@/components/wizard/WizardProgress";
import { SourceSelector } from "@/components/wizard/SourceSelector";
import { StoryConfigurator } from "@/components/wizard/StoryConfigurator";
import { ResearchProgress } from "@/components/wizard/ResearchProgress";
import { ResearchResultsCard } from "@/components/wizard/ResearchResultsCard";
import { CharacterSetupV2 } from "@/components/wizard/CharacterSetupV2";
import { OutlineApprovalCard } from "@/components/hitl/OutlineApprovalCard";
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
import { saveDraft, saveWizardProgress } from "@/lib/actions/user";

// Custom AI thinking animation - three bouncing dots
const ThinkingDots = (
  <div className="flex items-center gap-1.5">
    <span className="thinking-dot" style={{ animationDelay: "0s" }} />
    <span className="thinking-dot" style={{ animationDelay: "0.15s" }} />
    <span className="thinking-dot" style={{ animationDelay: "0.3s" }} />
  </div>
);

export default function WizardPage() {
  const router = useRouter();
  const [session, setSession] = useState<WizardSession>(INITIAL_WIZARD_SESSION);
  const [mode, setMode] = useState<"setup" | "research" | "writing">("setup");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Research state
  const [isResearching, setIsResearching] = useState(false);
  const [researchComplete, setResearchComplete] = useState(false);

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

  // Share wizard state with AI
  useCopilotReadable({
    description: "Current wizard session state",
    value: session,
  });

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

  // HITL: Present outline for approval
  useCopilotAction({
    name: "present_outline",
    description: "Present the generated story outline for approval",
    parameters: [
      {
        name: "outline",
        type: "string",
        description: "The generated story outline",
        required: true,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => (
      <OutlineApprovalCard
        outline={args.outline || ""}
        onApprove={() => {
          handleOutlineApproved(args.outline || "");
          respond?.({ approved: true, outline: args.outline });
        }}
        onReject={(feedback?: string) => {
          respond?.({
            approved: false,
            feedback: feedback || "Please regenerate with different ideas",
          });
        }}
        onEdit={(editedOutline) => {
          handleOutlineApproved(editedOutline);
          respond?.({ approved: true, outline: editedOutline });
        }}
      />
    ),
  });

  // HITL: Start writing action
  useCopilotAction({
    name: "start_writing",
    description: "User is ready to start writing their story",
    parameters: [],
    handler: async () => {
      if (mode !== "writing") {
        setMode("writing");
      }
    },
    render: () => (
      <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/30 rounded-xl">
        <Sparkles className="size-4 text-primary" />
        <span className="text-primary font-medium">
          Ready to start writing! Your draft has been saved.
        </span>
      </div>
    ),
  });

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
        // Outline step uses CopilotChat for AI generation
        // Build explicit context instructions for the AI
        const outlineInstructions = `STORY CONTEXT - YOU MUST USE THIS:
- Fandom: ${session.sourceName} (${session.sourceType})
- Ship Type: ${session.shipType?.toUpperCase() || "Not specified"}
- Setting: ${session.setting || "Not specified"}
- Characters: ${session.characters.map((c) => c.name).join(", ") || "Not selected"}
- Tags: ${session.additionalTags.join(", ") || "None"}
${session.researchData ? `- Available Characters: ${session.researchData.mainCharacters.map(c => c.name).join(", ")}` : ""}
${session.researchData?.popularShips?.length ? `- Popular Ships: ${session.researchData.popularShips.join(", ")}` : ""}

IMPORTANT: When the user asks for ANY type of story (gangster, school, romance, etc.), you MUST write it using the characters above (${session.characters.map((c) => c.name).join(", ") || "the specified characters"}) from ${session.sourceName}. Adapt the user's request to fit this fandom context. NEVER create generic OC characters.`;

        // Use a stable key based on session data to start fresh conversation for outline
        // This ensures a new thread when entering outline stage (avoids showing research messages)
        const outlineChatKey = `outline-${session.sourceName}-${session.characters.length}`;

        return (
          <div className="flex-1 overflow-hidden wizard-chat-cream bg-background">
            <CopilotChat
              key={outlineChatKey}
              instructions={outlineInstructions}
              labels={{
                title: "Story Outline",
                initial: `Great! Now let's create an outline for your ${session.sourceName} ${session.shipType?.toUpperCase() || ""} story set in a ${session.setting} setting.\n\nI'll generate a story outline based on:\n- Characters: ${session.characters.map((c) => c.name).join(", ")}\n- Tags: ${session.additionalTags.join(", ") || "None"}\n\nLet me create something special for you...`,
              }}
              icons={{
                activityIcon: ThinkingDots,
              }}
              className="h-full"
            />
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

        {/* AI Assistant Popup */}
        <CopilotPopup
          labels={{
            title: "Writing Assistant",
            initial:
              "Need help with your story? I can help you continue writing, expand scenes, or polish your prose.",
          }}
        />
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
