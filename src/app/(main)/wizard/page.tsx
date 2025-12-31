"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FandomSelector } from "@/components/wizard/FandomSelector";
import { ShipBuilder } from "@/components/wizard/ShipBuilder";
import { CharacterSetup } from "@/components/wizard/CharacterSetup";
import { OutlineApprovalCard } from "@/components/hitl/OutlineApprovalCard";
import type { StoryCharacter } from "@/lib/types/agent-state";

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
  const [pendingOutline, setPendingOutline] = useState<string | null>(null);

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
          setSession((prev) => ({ ...prev, outline: args.outline || "", step: "complete" }));
          respond?.({ approved: true, outline: args.outline || "" });
        }}
        onReject={() => {
          respond?.({ approved: false, feedback: "Please regenerate with different ideas" });
        }}
        onEdit={(editedOutline) => {
          setSession((prev) => ({ ...prev, outline: editedOutline, step: "complete" }));
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
      // Store session data and redirect to editor
      sessionStorage.setItem("wizard-session", JSON.stringify(session));
      router.push("/editor");
    },
    render: () => (
      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
        <span className="text-green-700">Redirecting to editor...</span>
      </div>
    ),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              FanFic Lab
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1">
              <span>🧙</span>
              Creative Wizard
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>🗺️</span>
                  Story Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <StepIndicator
                    step={1}
                    label="Choose Fandom"
                    completed={!!session.fandom}
                    current={session.step === "fandom"}
                    value={session.fandom}
                  />
                  <StepIndicator
                    step={2}
                    label="Define Ships"
                    completed={session.ships.length > 0}
                    current={session.step === "ship"}
                    value={session.ships.join(", ")}
                  />
                  <StepIndicator
                    step={3}
                    label="Setup Characters"
                    completed={session.characters.length > 0}
                    current={session.step === "characters"}
                    value={`${session.characters.length} characters`}
                  />
                  <StepIndicator
                    step={4}
                    label="Review Outline"
                    completed={!!session.outline}
                    current={session.step === "outline"}
                  />
                  <StepIndicator
                    step={5}
                    label="Start Writing"
                    completed={session.step === "complete"}
                    current={session.step === "complete"}
                  />
                </div>

                {session.step === "complete" && (
                  <div className="mt-6 pt-4 border-t">
                    <Button
                      onClick={() => {
                        sessionStorage.setItem("wizard-session", JSON.stringify(session));
                        router.push("/editor");
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      Go to Editor
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>🧙</span>
                  Creative Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <CopilotChat
                  labels={{
                    title: "Story Wizard",
                    initial: "Hi! I'm your creative writing assistant. Let's create an amazing fanfiction together! First, tell me which fandom you'd like to write in, or just say 'help me choose' if you're not sure.",
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

function StepIndicator({
  step,
  label,
  completed,
  current,
  value,
}: {
  step: number;
  label: string;
  completed: boolean;
  current: boolean;
  value?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${current ? "opacity-100" : "opacity-60"}`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          completed
            ? "bg-green-500 text-white"
            : current
            ? "bg-purple-600 text-white"
            : "bg-gray-200 text-gray-600"
        }`}
      >
        {completed ? "✓" : step}
      </div>
      <div>
        <div className={`font-medium ${current ? "text-purple-600" : ""}`}>{label}</div>
        {value && <div className="text-sm text-gray-500">{value}</div>}
      </div>
    </div>
  );
}
