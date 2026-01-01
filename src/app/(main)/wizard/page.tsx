"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import {
  Sparkles,
  BookOpen,
  Heart,
  Users,
  FileText,
  PenLine,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FandomSelector } from "@/components/wizard/FandomSelector";
import { ShipBuilder } from "@/components/wizard/ShipBuilder";
import { CharacterSetup } from "@/components/wizard/CharacterSetup";
import { OutlineApprovalCard } from "@/components/hitl/OutlineApprovalCard";
import type { StoryCharacter } from "@/lib/types/agent-state";
import { cn } from "@/lib/utils";

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

const WIZARD_STEPS = [
  { key: "fandom", label: "Choose Fandom", icon: BookOpen },
  { key: "ship", label: "Define Ships", icon: Heart },
  { key: "characters", label: "Setup Characters", icon: Users },
  { key: "outline", label: "Review Outline", icon: FileText },
  { key: "complete", label: "Start Writing", icon: PenLine },
] as const;

export default function WizardPage() {
  const router = useRouter();
  const [session, setSession] = useState<WizardSession>(INITIAL_SESSION);

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

  // HITL: Approve outline
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
          setSession((prev) => ({
            ...prev,
            outline: args.outline || "",
            step: "complete",
          }));
          respond?.({ approved: true, outline: args.outline || "" });
        }}
        onReject={() => {
          respond?.({
            approved: false,
            feedback: "Please regenerate with different ideas",
          });
        }}
        onEdit={(editedOutline) => {
          setSession((prev) => ({
            ...prev,
            outline: editedOutline,
            step: "complete",
          }));
          respond?.({ approved: true, outline: editedOutline });
        }}
      />
    ),
  });

  // Action to start writing
  useCopilotAction({
    name: "start_writing",
    description: "User is ready to start writing their story",
    parameters: [],
    handler: async () => {
      sessionStorage.setItem("wizard-session", JSON.stringify(session));
      router.push("/editor");
    },
    render: () => (
      <div className="flex items-center gap-2 p-4 bg-success/10 border border-success/30 rounded-xl">
        <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-success font-medium">
          Redirecting to editor...
        </span>
      </div>
    ),
  });

  const currentStepIndex = WIZARD_STEPS.findIndex(
    (s) => s.key === session.step
  );

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Progress Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="sticky top-24">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-secondary text-secondary-foreground">
                    <FileText className="size-4" />
                  </div>
                  Story Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {WIZARD_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted =
                    index < currentStepIndex ||
                    (step.key === "complete" && session.step === "complete");
                  const isCurrent = step.key === session.step;

                  let value: string | undefined;
                  if (step.key === "fandom" && session.fandom) {
                    value = session.fandom;
                  } else if (step.key === "ship" && session.ships.length > 0) {
                    value = session.ships.join(", ");
                  } else if (
                    step.key === "characters" &&
                    session.characters.length > 0
                  ) {
                    value = `${session.characters.length} characters`;
                  }

                  return (
                    <div
                      key={step.key}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg transition-colors",
                        isCurrent && "bg-secondary",
                        !isCurrent && !isCompleted && "opacity-50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                          isCompleted && "bg-success text-white",
                          isCurrent && !isCompleted && "bg-primary text-primary-foreground",
                          !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="size-4" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "font-medium text-sm",
                            isCurrent && "text-primary",
                            !isCurrent && "text-foreground"
                          )}
                        >
                          {step.label}
                        </div>
                        {value && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {value}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {session.step === "complete" && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <Button
                      onClick={() => {
                        sessionStorage.setItem(
                          "wizard-session",
                          JSON.stringify(session)
                        );
                        router.push("/editor");
                      }}
                      className="w-full gap-2"
                    >
                      Go to Editor
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 xl:col-span-9">
            <Card className="h-[calc(100vh-200px)] min-h-[500px] flex flex-col overflow-hidden">
              <CardHeader className="border-b border-border bg-ai-surface py-4">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
                    <Sparkles className="size-4" />
                  </div>
                  <span>Creative Assistant</span>
                  <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                    <div className="size-2 rounded-full bg-success animate-pulse" />
                    Ready to help
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <CopilotChat
                  labels={{
                    title: "Story Wizard",
                    initial:
                      "Hi! I'm your creative writing assistant. Let's create an amazing fanfiction together!\n\nFirst, tell me which fandom you'd like to write in, or just say 'help me choose' if you're not sure.",
                  }}
                  className="h-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
