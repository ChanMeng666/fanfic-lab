"use client";

import { useState } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StoryContext } from "@/lib/types/agent-state";

interface AIToolbarProps {
  selectedText: string;
  isProcessing: boolean;
  storyContext: StoryContext;
}

export function AIToolbar({
  selectedText,
  isProcessing,
  storyContext,
}: AIToolbarProps) {
  const { appendMessage } = useCopilotChat();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleMagicContinue = async () => {
    setActiveAction("continue");
    await appendMessage(
      new TextMessage({
        role: Role.User,
        content: `Continue the story naturally from where it left off. Write about 200-300 words that flow naturally from the current content. Maintain the ${storyContext.tone} tone and keep characters in voice.`,
      })
    );
    setActiveAction(null);
  };

  const handleExpand = async (focus: string) => {
    if (!selectedText) return;
    setActiveAction("expand");
    await appendMessage(
      new TextMessage({
        role: Role.User,
        content: `Expand the following text with more ${focus}. Keep the same style and tone:\n\n"${selectedText}"`,
      })
    );
    setActiveAction(null);
  };

  const handlePolish = async (level: string) => {
    if (!selectedText) return;
    setActiveAction("polish");
    await appendMessage(
      new TextMessage({
        role: Role.User,
        content: `Polish this text with a ${level} level of editing. Improve prose quality while preserving the author's voice:\n\n"${selectedText}"`,
      })
    );
    setActiveAction(null);
  };

  const handleOOCCheck = async () => {
    setActiveAction("ooc");
    await appendMessage(
      new TextMessage({
        role: Role.User,
        content: `Check the current story content for any out-of-character (OOC) moments. For each character (${storyContext.characters.map((c) => c.name).join(", ")}), identify any dialogue or actions that seem inconsistent with their established personality and provide suggestions for fixes.`,
      })
    );
    setActiveAction(null);
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 border-b mb-4 rounded-t-lg">
      {/* Magic Continue */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleMagicContinue}
        disabled={isProcessing || activeAction === "continue"}
        className="gap-2"
      >
        {activeAction === "continue" ? (
          <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
        ) : (
          <span>🪄</span>
        )}
        Magic Continue
      </Button>

      {/* Expand Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedText || isProcessing || activeAction === "expand"}
            className="gap-2"
          >
            {activeAction === "expand" ? (
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            ) : (
              <span>📝</span>
            )}
            Expand
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleExpand("dialogue")}>
            More Dialogue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExpand("description")}>
            More Description
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExpand("emotion")}>
            More Emotion
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExpand("action")}>
            More Action
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExpand("atmosphere")}>
            More Atmosphere
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Polish Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedText || isProcessing || activeAction === "polish"}
            className="gap-2"
          >
            {activeAction === "polish" ? (
              <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
            ) : (
              <span>✨</span>
            )}
            Polish
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handlePolish("light")}>
            Light Touch
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePolish("medium")}>
            Medium Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlePolish("heavy")}>
            Deep Polish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* OOC Check */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOOCCheck}
        disabled={isProcessing || activeAction === "ooc" || storyContext.characters.length === 0}
        className="gap-2"
      >
        {activeAction === "ooc" ? (
          <div className="animate-spin h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full" />
        ) : (
          <span>🎭</span>
        )}
        OOC Check
      </Button>

      {/* Selection indicator */}
      {selectedText && (
        <span className="text-xs text-gray-500 ml-2">
          {selectedText.length} chars selected
        </span>
      )}
    </div>
  );
}
