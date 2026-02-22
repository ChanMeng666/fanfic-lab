"use client";

import { useState } from "react";
import { Wand2, FileText, Sparkles, Theater, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { StoryContext } from "@/lib/types/agent-state";

interface AIToolbarProps {
  selectedText: string;
  isProcessing: boolean;
  storyContext: StoryContext;
  content: string;
  onResult: (result: string) => void;
  requestContinuation: (content: string) => Promise<string | null>;
  requestExpansion: (content: string, selectedText: string, focusArea: string) => Promise<string | null>;
  requestPolish: (content: string, selectedText: string, intensity: string) => Promise<string | null>;
  requestOOCCheck: (content: string) => Promise<string | null>;
}

type ActionType = "continue" | "expand" | "polish" | "ooc" | null;

export function AIToolbar({
  selectedText,
  isProcessing,
  storyContext,
  content,
  onResult,
  requestContinuation,
  requestExpansion,
  requestPolish,
  requestOOCCheck,
}: AIToolbarProps) {
  const [activeAction, setActiveAction] = useState<ActionType>(null);

  const handleMagicContinue = async () => {
    setActiveAction("continue");
    const result = await requestContinuation(content);
    if (result) onResult(result);
    setActiveAction(null);
  };

  const handleExpand = async (focus: string) => {
    if (!selectedText) return;
    setActiveAction("expand");
    const result = await requestExpansion(content, selectedText, focus);
    if (result) onResult(result);
    setActiveAction(null);
  };

  const handlePolish = async (level: string) => {
    if (!selectedText) return;
    setActiveAction("polish");
    const result = await requestPolish(content, selectedText, level);
    if (result) onResult(result);
    setActiveAction(null);
  };

  const handleOOCCheck = async () => {
    setActiveAction("ooc");
    const result = await requestOOCCheck(content);
    if (result) onResult(result);
    setActiveAction(null);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-xl shadow-sm">
      {/* Magic Continue - Primary AI action */}
      <ToolbarButton
        icon={Wand2}
        label="Continue"
        onClick={handleMagicContinue}
        disabled={isProcessing}
        isActive={activeAction === "continue"}
        variant="primary"
      />

      {/* Expand Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ToolbarButton
            icon={FileText}
            label="Expand"
            disabled={!selectedText || isProcessing}
            isActive={activeAction === "expand"}
            hasDropdown
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
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
          <ToolbarButton
            icon={Sparkles}
            label="Polish"
            disabled={!selectedText || isProcessing}
            isActive={activeAction === "polish"}
            hasDropdown
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
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
      <ToolbarButton
        icon={Theater}
        label="OOC Check"
        onClick={handleOOCCheck}
        disabled={isProcessing || storyContext.characters.length === 0}
        isActive={activeAction === "ooc"}
      />

      {/* Selection indicator */}
      {selectedText && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs">
          <span className="size-1.5 rounded-full bg-primary" />
          {selectedText.length} chars selected
        </div>
      )}
    </div>
  );
}

// Toolbar button component
interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  isActive?: boolean;
  variant?: "default" | "primary";
  hasDropdown?: boolean;
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  isActive,
  variant = "default",
  hasDropdown,
}: ToolbarButtonProps) {
  const Comp = hasDropdown ? "div" : Button;

  return (
    <Comp
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
        "border border-transparent",
        // Default state
        !isActive &&
          variant === "default" &&
          "text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border",
        // Primary variant
        !isActive &&
          variant === "primary" &&
          "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
        // Active/Loading state
        isActive && "bg-accent-subtle text-accent-foreground border-accent/30",
        // Disabled
        disabled && "opacity-50 cursor-not-allowed",
        // Button style when not disabled
        !disabled && "cursor-pointer"
      )}
    >
      {isActive ? (
        <div className="size-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon className="size-4" />
      )}
      <span>{label}</span>
      {hasDropdown && <ChevronDown className="size-3.5 ml-0.5 opacity-60" />}
    </Comp>
  );
}
