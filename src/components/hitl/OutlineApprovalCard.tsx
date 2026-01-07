"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Check, Pencil, RefreshCw, Sparkles, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

interface OutlineApprovalCardProps {
  outline: string;
  onApprove: () => void;
  onReject: (feedback?: string) => void;
  onEdit?: (editedOutline: string) => void;
}

export function OutlineApprovalCard({
  outline,
  onApprove,
  onReject,
  onEdit,
}: OutlineApprovalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutline, setEditedOutline] = useState(outline);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Sync editedOutline when outline prop changes (fixes empty textarea issue)
  useEffect(() => {
    setEditedOutline(outline);
  }, [outline]);

  const handleSaveEdit = () => {
    onEdit?.(editedOutline);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedOutline(outline);
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    onReject(feedback.trim() || undefined);
    setFeedback("");
    setShowFeedback(false);
  };

  const handleCancelFeedback = () => {
    setFeedback("");
    setShowFeedback(false);
  };

  // Count sections for display (headers starting with #)
  const sectionCount = (outline.match(/^#{1,3}\s/gm) || []).length;

  return (
    <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-accent/15 text-accent">
          <ClipboardList className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-semibold text-foreground">Story Outline</h3>
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="size-3" />
              AI Generated
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Review and approve before continuing</p>
        </div>
      </div>

      {/* Content */}
      <div>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedOutline}
              onChange={(e) => setEditedOutline(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} className="gap-1.5">
                <Check className="size-3.5" />
                Save Changes
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : showFeedback ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MessageSquare className="size-4" />
              <span>What would you like to change?</span>
            </div>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g., Make the conflict more intense, add more romantic tension, include a plot twist..."
              className="min-h-[100px] text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRegenerate} className="gap-1.5">
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelFeedback} className="gap-1.5">
                <X className="size-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-[400px] overflow-y-auto mb-4 pr-2">
              <ReactMarkdown
                components={{
                  // Headings
                  h1: ({ children }) => (
                    <h1 className="font-display text-xl font-bold text-foreground mt-6 mb-3 first:mt-0 border-b border-border pb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="font-display text-lg font-semibold text-foreground mt-5 mb-2 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="font-display text-base font-semibold text-primary mt-4 mb-2 first:mt-0">
                      {children}
                    </h3>
                  ),
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">
                      {children}
                    </p>
                  ),
                  // Bold text
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  // Italic text
                  em: ({ children }) => (
                    <em className="italic text-muted-foreground">
                      {children}
                    </em>
                  ),
                  // Ordered lists
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside ml-5 my-3 space-y-2 text-sm">
                      {children}
                    </ol>
                  ),
                  // Unordered lists
                  ul: ({ children }) => (
                    <ul className="list-disc list-outside ml-5 my-3 space-y-2 text-sm">
                      {children}
                    </ul>
                  ),
                  // List items
                  li: ({ children }) => (
                    <li className="text-foreground leading-relaxed pl-1">
                      {children}
                    </li>
                  ),
                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-primary/50 pl-4 my-4 italic text-muted-foreground bg-surface/50 py-2 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  // Horizontal rule
                  hr: () => (
                    <hr className="my-4 border-border" />
                  ),
                }}
              >
                {outline}
              </ReactMarkdown>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-border/50">
              <Button
                size="sm"
                onClick={onApprove}
                className="gap-1.5"
              >
                <Check className="size-3.5" />
                Accept Outline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
              >
                <Pencil className="size-3.5" />
                Edit First
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFeedback(true)} className="gap-1.5">
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
              <div className="flex-1" />
              {sectionCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {sectionCount} sections
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
