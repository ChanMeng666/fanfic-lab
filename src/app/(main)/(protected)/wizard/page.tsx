"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat, CopilotPopup } from "@copilotkit/react-ui";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Sparkles } from "lucide-react";
import { FandomSelector } from "@/components/wizard/FandomSelector";
import { ShipBuilder } from "@/components/wizard/ShipBuilder";
import { CharacterSetup } from "@/components/wizard/CharacterSetup";
import { OutlineApprovalCard } from "@/components/hitl/OutlineApprovalCard";
import { InlineWritingArea } from "@/components/wizard/InlineWritingArea";
import type { StoryCharacter } from "@/lib/types/agent-state";
import { saveDraft } from "@/lib/actions/user";

// Custom AI thinking animation - three bouncing dots
const ThinkingDots = (
  <div className="flex items-center gap-1.5">
    <span className="thinking-dot" style={{ animationDelay: "0s" }} />
    <span className="thinking-dot" style={{ animationDelay: "0.15s" }} />
    <span className="thinking-dot" style={{ animationDelay: "0.3s" }} />
  </div>
);

interface WizardSession {
  step: "fandom" | "ship" | "characters" | "outline" | "complete";
  fandom: string;
  ships: string[];
  characters: StoryCharacter[];
  tags: string[];
  tone: string;
  outline: string;
}

const INITIAL_SESSION: WizardSession = {
  step: "fandom",
  fandom: "",
  ships: [],
  characters: [],
  tags: [],
  tone: "neutral",
  outline: "",
};

export default function WizardPage() {
  const router = useRouter();
  const [session, setSession] = useState<WizardSession>(INITIAL_SESSION);
  const [mode, setMode] = useState<"setup" | "writing">("setup");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Handle content save
  const handleSaveContent = useCallback(async (newContent: string) => {
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
  }, [draftId]);

  // Share wizard state with AI
  useCopilotReadable({
    description: "Current wizard session state",
    value: session,
  });

  // HITL: Gather fandom information
  useCopilotAction({
    name: "gather_fandom_info",
    description: "Ask user to select a fandom for their story",
    parameters: [],
    renderAndWaitForResponse: ({ respond }) => (
      <FandomSelector
        onSelect={(fandom) => {
          setSession((prev) => ({ ...prev, fandom, step: "ship" }));
          respond?.({ fandom });
        }}
      />
    ),
  });

  // HITL: Select ships
  useCopilotAction({
    name: "select_ships",
    description: "Ask user to define romantic pairings for their story",
    parameters: [
      {
        name: "fandom",
        type: "string",
        description: "The fandom context",
        required: true,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => (
      <ShipBuilder
        fandom={args.fandom || session.fandom}
        onSelect={(ships) => {
          setSession((prev) => ({ ...prev, ships, step: "characters" }));
          respond?.({ ships });
        }}
      />
    ),
  });

  // HITL: Setup characters
  useCopilotAction({
    name: "setup_characters",
    description: "Ask user to define main characters for their story",
    parameters: [
      {
        name: "fandom",
        type: "string",
        description: "The fandom context",
        required: true,
      },
      {
        name: "suggestedCharacters",
        type: "string[]",
        description: "AI suggested characters based on fandom and ships",
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, respond }) => (
      <CharacterSetup
        fandom={args.fandom || session.fandom}
        suggestedCharacters={args.suggestedCharacters}
        onComplete={(characters) => {
          setSession((prev) => ({ ...prev, characters, step: "outline" }));
          respond?.({ characters });
        }}
      />
    ),
  });

  // HITL: Approve outline with auto-save
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
    renderAndWaitForResponse: ({ args, respond }) => {
      const handleApprove = async (finalOutline: string) => {
        // Update local state
        setSession((prev) => ({
          ...prev,
          outline: finalOutline,
          step: "complete",
        }));

        try {
          // Auto-save to database
          const draft = await saveDraft({
            title: `${session.fandom} Story`,
            content: "",
            fandom: session.fandom,
            ships: session.ships,
            tags: session.tags,
            aiContext: {
              characters: session.characters,
              outline: finalOutline,
              tone: session.tone,
            },
          });

          setDraftId(draft.id);
          setLastSaved(new Date());
          setMode("writing");
        } catch (error) {
          console.error("Failed to save draft:", error);
        }

        respond?.({ approved: true, outline: finalOutline });
      };

      return (
        <OutlineApprovalCard
          outline={args.outline || ""}
          onApprove={() => handleApprove(args.outline || "")}
          onReject={() => {
            respond?.({
              approved: false,
              feedback: "Please regenerate with different ideas",
            });
          }}
          onEdit={(editedOutline) => handleApprove(editedOutline)}
        />
      );
    },
  });

  // Action to continue to writing (legacy support)
  useCopilotAction({
    name: "start_writing",
    description: "User is ready to start writing their story",
    parameters: [],
    handler: async () => {
      // Just switch to writing mode if not already
      if (mode !== "writing") {
        setMode("writing");
      }
    },
    render: () => (
      <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/30 rounded-xl">
        <Sparkles className="size-4 text-success" />
        <span className="text-success font-medium">
          Ready to start writing! Your draft has been saved.
        </span>
      </div>
    ),
  });

  // Full-screen layout
  return (
    <div className="h-screen flex flex-col">
      {/* Main Content */}
      {mode === "setup" ? (
        /* Setup Mode: Full-screen Chat with cream background */
        <div className="flex-1 overflow-hidden wizard-chat-cream bg-background">
          <CopilotChat
            labels={{
              title: "Story Wizard",
              initial:
                "Hi! I'm your creative writing assistant. Let's create an amazing fanfiction together!\n\nFirst, tell me which fandom you'd like to write in, or just say 'help me choose' if you're not sure.",
            }}
            icons={{
              activityIcon: ThinkingDots,
            }}
            className="h-full"
          />
        </div>
      ) : (
        /* Writing Mode: Editor with AI Popup */
        <div className="flex-1 overflow-hidden relative flex flex-col bg-background">
          {/* Writing Mode Header */}
          <header className="h-12 border-b border-border/50 flex items-center px-4 gap-3 flex-shrink-0 bg-surface/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">{session.fandom}</span>
              {session.ships.length > 0 && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">{session.ships.join(", ")}</span>
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
                fandom: session.fandom,
                ships: session.ships,
                characters: session.characters,
                tone: session.tone,
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
              initial: "Need help with your story? I can help you continue writing, expand scenes, or polish your prose.",
            }}
          />
        </div>
      )}
    </div>
  );
}
