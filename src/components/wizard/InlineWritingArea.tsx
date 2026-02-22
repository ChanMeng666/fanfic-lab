"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Sparkles, PenLine, FileText, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentApprovalCard } from "@/components/hitl/ContentApprovalCard";
import ReactMarkdown from "react-markdown";
import type { StoryCharacter, PendingContent } from "@/lib/types/agent-state";

interface StoryContext {
  fandom: string;
  ships: string[];
  characters: StoryCharacter[];
  tone: string;
  outline: string;
}

interface InlineWritingAreaProps {
  draftId: string | null;
  storyContext: StoryContext;
  content: string;
  onContentChange: (content: string) => void;
}

// Auto-save interval in milliseconds (30 seconds)
const AUTO_SAVE_INTERVAL = 30000;

export function InlineWritingArea({
  draftId,
  storyContext,
  content,
  onContentChange,
}: InlineWritingAreaProps) {
  const [localContent, setLocalContent] = useState(content);
  const [pendingContent, setPendingContent] = useState<PendingContent | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef(content);

  // Calculate word count
  useEffect(() => {
    const words = localContent.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [localContent]);

  // Debounced auto-save (only save if content actually changed)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only set up save if content has changed from last saved
    if (localContent !== lastSavedContentRef.current) {
      debounceRef.current = setTimeout(() => {
        onContentChange(localContent);
        lastSavedContentRef.current = localContent;
      }, AUTO_SAVE_INTERVAL);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localContent, onContentChange]);

  // Handle content change from textarea
  const handleChange = useCallback((value: string) => {
    setLocalContent(value);
  }, []);

  // Handle manual save
  const handleManualSave = useCallback(() => {
    if (localContent !== lastSavedContentRef.current) {
      onContentChange(localContent);
      lastSavedContentRef.current = localContent;
    }
  }, [localContent, onContentChange]);

  // Handle accepting AI-generated content
  const handleAcceptContent = useCallback((newContent: string) => {
    setLocalContent((prev) => prev + "\n\n" + newContent);
    setPendingContent(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Writing Area Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
            <PenLine className="size-4" />
          </div>
          <span className="font-display text-lg">Write Your Story</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <FileText className="size-4 inline mr-1.5" />
            {wordCount} words
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleManualSave}
          >
            <Save className="size-3.5" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Writing Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Story Outline Summary */}
          {storyContext.outline && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
                className="w-full flex items-center justify-between py-2 text-left group"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-accent" />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    Story Outline
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-xs">
                    {isOutlineExpanded ? "Collapse" : "Expand"}
                  </span>
                  {isOutlineExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </div>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOutlineExpanded ? "max-h-[500px] opacity-100" : "max-h-16 opacity-70"
                }`}
              >
                <div className={`text-sm ${!isOutlineExpanded ? "line-clamp-2" : "overflow-y-auto max-h-[480px] pr-2"}`}>
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="font-display text-base font-semibold text-foreground mt-3 mb-1.5 first:mt-0">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="font-display text-sm font-semibold text-foreground mt-2.5 mb-1 first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="font-display text-sm font-medium text-primary mt-2 mb-1 first:mt-0">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-muted-foreground leading-relaxed mb-2 last:mb-0">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-medium text-foreground">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-4 my-2 space-y-1">
                          {children}
                        </ol>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-outside ml-4 my-2 space-y-1">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-muted-foreground leading-relaxed">
                          {children}
                        </li>
                      ),
                    }}
                  >
                    {storyContext.outline}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Subtle divider */}
              <div className="mt-4 border-b border-border/50" />
            </div>
          )}

          {/* Writing textarea */}
          <textarea
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Start writing your story here..."
            className="min-h-[400px] w-full resize-none rounded-xl border border-border bg-surface p-4 font-prose text-base leading-relaxed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* Pending AI Content Approval */}
          {pendingContent && (
            <div className="mt-4">
              <ContentApprovalCard
                type={pendingContent.type}
                content={pendingContent.content}
                onApprove={() => handleAcceptContent(pendingContent.content)}
                onReject={() => setPendingContent(null)}
                onEdit={(edited) => handleAcceptContent(edited)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
