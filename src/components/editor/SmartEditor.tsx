"use client";

import { useState, useCallback } from "react";
import { CopilotTextarea } from "@copilotkit/react-textarea";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { Card } from "@/components/ui/card";
import { AIToolbar } from "./AIToolbar";
import { OOCChecker, type OOCIssue } from "./OOCChecker";
import { ContentApprovalCard } from "@/components/hitl/ContentApprovalCard";
import type { StoryContext, PendingContent } from "@/lib/types/agent-state";

interface SmartEditorProps {
  initialContent?: string;
  storyContext: StoryContext;
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => void;
}

export function SmartEditor({
  initialContent = "",
  storyContext,
  onContentChange,
  onSave,
}: SmartEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [selectedText, setSelectedText] = useState("");
  const [pendingContent, setPendingContent] = useState<PendingContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [oocResults, setOocResults] = useState<OOCIssue[]>([]);
  const [isCheckingOOC, setIsCheckingOOC] = useState(false);

  // Provide story context to the AI
  useCopilotReadable({
    description: "Current story being edited",
    value: {
      fandom: storyContext.fandom,
      ships: storyContext.ships,
      tags: storyContext.tags,
      tone: storyContext.tone,
      characters: storyContext.characters.map((c) => ({
        name: c.name,
        personality: c.personality,
      })),
      currentChapter: storyContext.currentChapter,
      plotPoints: storyContext.plotPoints,
    },
  });

  useCopilotReadable({
    description: "Current editor content",
    value: content,
  });

  // Handle text selection
  const handleSelect = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString());
    }
  }, []);

  // Handle content change
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      onContentChange?.(newContent);
    },
    [onContentChange]
  );

  // AI action: Generate continuation
  useCopilotAction({
    name: "continue_story",
    description: "Continue the story from where the user left off",
    parameters: [
      {
        name: "continuation",
        type: "string",
        description: "The generated story continuation",
        required: true,
      },
    ],
    handler: async ({ continuation }) => {
      setPendingContent({
        type: "continuation",
        content: continuation,
      });
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
            <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
            <span className="text-sm text-purple-700">Writing continuation...</span>
          </div>
        );
      }
      return <></>;
    },
  });

  // AI action: Expand text
  useCopilotAction({
    name: "expand_text",
    description: "Expand the selected text with more detail",
    parameters: [
      {
        name: "expanded",
        type: "string",
        description: "The expanded version of the text",
        required: true,
      },
    ],
    handler: async ({ expanded }) => {
      setPendingContent({
        type: "expansion",
        content: expanded,
      });
    },
    render: ({ status }) => {
      if (status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-sm text-blue-700">Expanding text...</span>
          </div>
        );
      }
      return <></>;
    },
  });

  // AI action: Polish prose
  useCopilotAction({
    name: "polish_prose",
    description: "Polish and improve the selected text",
    parameters: [
      {
        name: "polished",
        type: "string",
        description: "The polished version of the text",
        required: true,
      },
    ],
    handler: async ({ polished }) => {
      setPendingContent({
        type: "expansion",
        content: polished,
      });
    },
    render: ({ status }) => {
      if (status === "inProgress") {
        return (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full" />
            <span className="text-sm text-green-700">Polishing prose...</span>
          </div>
        );
      }
      return <></>;
    },
  });

  // AI action: Check OOC
  useCopilotAction({
    name: "check_ooc",
    description: "Check story content for out-of-character moments",
    parameters: [
      {
        name: "issues",
        type: "object[]",
        description: "Array of OOC issues found",
        required: true,
      },
    ],
    handler: async ({ issues }) => {
      const mappedIssues: OOCIssue[] = (issues as unknown[]).map((issue: unknown) => {
        const i = issue as Record<string, unknown>;
        return {
          characterId: String(i.characterId || ""),
          characterName: String(i.characterName || "Unknown"),
          issueType: (i.issueType as OOCIssue["issueType"]) || "behavior",
          excerpt: String(i.excerpt || ""),
          explanation: String(i.explanation || ""),
          suggestion: String(i.suggestion || ""),
          severity: (i.severity as OOCIssue["severity"]) || "medium",
        };
      });
      setOocResults(mappedIssues);
      setIsCheckingOOC(false);
    },
    render: ({ status }) => {
      if (status === "inProgress") {
        setIsCheckingOOC(true);
        return (
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <div className="animate-spin h-4 w-4 border-2 border-orange-600 border-t-transparent rounded-full" />
            <span className="text-sm text-orange-700">Checking for OOC moments...</span>
          </div>
        );
      }
      return <></>;
    },
  });

  // Handle approval of pending content
  const handleApprove = useCallback(() => {
    if (!pendingContent) return;

    if (pendingContent.type === "continuation") {
      // Append to end
      setContent((prev) => prev + "\n\n" + pendingContent.content);
    } else if (selectedText) {
      // Replace selected text
      setContent((prev) => prev.replace(selectedText, pendingContent.content));
    }

    setPendingContent(null);
    setSelectedText("");
  }, [pendingContent, selectedText]);

  // Handle rejection of pending content
  const handleReject = useCallback(() => {
    setPendingContent(null);
  }, []);

  // Build autosuggest context
  const autosuggestContext = `
You are helping write a ${storyContext.fandom} fanfiction.
Tone: ${storyContext.tone}
Ships: ${storyContext.ships.join(", ") || "None"}
Characters: ${storyContext.characters.map((c) => c.name).join(", ") || "None"}

Continue the story naturally, maintaining character voices and the established tone.
Write in the same style as the existing content.
`.trim();

  return (
    <div className="flex flex-col h-full">
      {/* AI Toolbar */}
      <AIToolbar
        selectedText={selectedText}
        isProcessing={isProcessing}
        storyContext={storyContext}
      />

      {/* OOC Results */}
      {(oocResults.length > 0 || isCheckingOOC) && (
        <div className="mb-4">
          <OOCChecker
            results={oocResults}
            isChecking={isCheckingOOC}
            onApplySuggestion={(issue) => {
              // Replace the excerpt with the suggestion
              setContent((prev) => prev.replace(issue.excerpt, issue.suggestion));
              setOocResults((prev) =>
                prev.filter(
                  (i) =>
                    !(
                      i.characterId === issue.characterId &&
                      i.excerpt === issue.excerpt
                    )
                )
              );
            }}
            onDismiss={(issue) => {
              setOocResults((prev) =>
                prev.filter(
                  (i) =>
                    !(
                      i.characterId === issue.characterId &&
                      i.excerpt === issue.excerpt
                    )
                )
              );
            }}
            onClear={() => setOocResults([])}
          />
        </div>
      )}

      {/* Pending Content Approval */}
      {pendingContent && (
        <div className="mb-4">
          <ContentApprovalCard
            type={pendingContent.type}
            content={pendingContent.content}
            onApprove={handleApprove}
            onReject={handleReject}
            onEdit={(edited) => {
              setPendingContent({ ...pendingContent, content: edited });
            }}
          />
        </div>
      )}

      {/* Main Editor */}
      <Card className="flex-1 p-4">
        <CopilotTextarea
          className="w-full h-full min-h-[500px] resize-none border-none focus:outline-none focus:ring-0 text-lg leading-relaxed font-serif"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={handleSelect}
          placeholder="Start writing your story here..."
          autosuggestionsConfig={{
            textareaPurpose: autosuggestContext,
            chatApiConfigs: {},
          }}
        />
      </Card>

      {/* Word Count */}
      <div className="mt-2 text-right text-sm text-gray-500">
        {content.split(/\s+/).filter(Boolean).length} words
      </div>
    </div>
  );
}
