"use client";

import { useState } from "react";
import { CopilotChat } from "@copilotkit/react-ui";
import { useCopilotChat } from "@copilotkit/react-core";
import {
  Sparkles,
  BookOpen,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Wand2,
  FileText,
  Palette,
  Theater,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AIPartnerPanelProps {
  storyContext?: {
    fandom?: string;
    ships?: string[];
    tone?: string;
    characters?: Array<{ name: string; fandom?: string }>;
  };
  wordCount?: number;
  className?: string;
}

export function AIPartnerPanel({
  storyContext,
  wordCount = 0,
  className,
}: AIPartnerPanelProps) {
  const [isContextExpanded, setIsContextExpanded] = useState(true);
  const { isLoading } = useCopilotChat();

  // Quick action suggestions
  const quickActions = [
    { icon: Wand2, label: "Continue", action: "continue_story" },
    { icon: FileText, label: "Expand", action: "expand_scene" },
    { icon: Palette, label: "Polish", action: "polish_prose" },
    { icon: Theater, label: "OOC Check", action: "checkOOC" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-surface border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-ai-surface">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-2.5 rounded-full transition-colors",
              isLoading ? "bg-accent animate-pulse" : "bg-success"
            )}
          />
          <Sparkles className="size-4 text-accent" />
          <span className="font-medium text-sm">AI Partner</span>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {isLoading ? "Thinking..." : "Ready"}
        </div>
      </div>

      {/* Context Section - Collapsible */}
      {storyContext && (
        <div className="border-b border-border">
          <button
            onClick={() => setIsContextExpanded(!isContextExpanded)}
            className="flex items-center justify-between w-full px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">Story Context</span>
            {isContextExpanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>

          {isContextExpanded && (
            <div className="px-4 pb-3 space-y-2">
              {storyContext.fandom && (
                <ContextTag icon={BookOpen} label={storyContext.fandom} />
              )}
              {storyContext.ships && storyContext.ships.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {storyContext.ships.map((ship, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground"
                    >
                      {ship}
                    </span>
                  ))}
                </div>
              )}
              {storyContext.characters && storyContext.characters.length > 0 && (
                <ContextTag
                  icon={Users}
                  label={`${storyContext.characters.length} characters`}
                />
              )}
              {storyContext.tone && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-accent-subtle text-accent-foreground">
                  {storyContext.tone}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex gap-1.5">
          {quickActions.map((action) => (
            <Button
              key={action.action}
              variant="ai-ghost"
              size="sm"
              className="flex-1 text-xs gap-1"
            >
              <action.icon className="size-3" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden">
        <CopilotChat
          className="h-full [&_.copilotKitMessages]:px-3 [&_.copilotKitMessages]:py-3"
          labels={{
            title: "",
            initial: "Hi! I'm your writing partner. How can I help with your story?",
            placeholder: "Ask me anything about your story...",
          }}
          instructions={`You are a creative writing partner helping with fanfiction.
            ${storyContext?.fandom ? `The story is set in the ${storyContext.fandom} fandom.` : ""}
            ${storyContext?.tone ? `The tone should be ${storyContext.tone}.` : ""}
            Be helpful, creative, and encouraging. Focus on character consistency and engaging storytelling.`}
        />
      </div>

      {/* Footer - Stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MessageSquare className="size-3" />
          <span>Word count: {wordCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Helper component for context tags
function ContextTag({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3" />
      <span>{label}</span>
    </div>
  );
}

export default AIPartnerPanel;
