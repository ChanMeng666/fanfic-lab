"use client";

import { useState, useCallback } from "react";
import { useEditorAI } from "@/lib/hooks/useEditorAI";
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

  const { isLoading: isAILoading, requestContinuation, requestExpansion, requestPolish, requestOOCCheck } = useEditorAI({ storyContext });

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

  return (
    <div className="flex flex-col h-full">
      {/* AI Toolbar */}
      <AIToolbar
        selectedText={selectedText}
        isProcessing={isAILoading}
        storyContext={storyContext}
        content={content}
        onResult={(result) => {
          setPendingContent({ type: "continuation", content: result });
        }}
        requestContinuation={requestContinuation}
        requestExpansion={requestExpansion}
        requestPolish={requestPolish}
        requestOOCCheck={requestOOCCheck}
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
      <Card className="flex-1 p-4 border-border">
        <textarea
          className="w-full h-full min-h-[500px] resize-none border-none focus:outline-none focus:ring-0 text-lg leading-relaxed font-prose bg-transparent text-foreground placeholder:text-muted-foreground"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={handleSelect}
          placeholder="Start writing your story here..."
        />
      </Card>

      {/* Word Count */}
      <div className="mt-2 text-right text-sm text-muted-foreground">
        {content.split(/\s+/).filter(Boolean).length} words
      </div>
    </div>
  );
}
