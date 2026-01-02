"use client";

import { useState } from "react";
import {
  FileText,
  Wand2,
  Maximize2,
  Palette,
  Sparkles,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ContentApprovalCardProps {
  type: "outline" | "continuation" | "expansion" | "image";
  content: string;
  onApprove: () => void;
  onReject: () => void;
  onEdit?: (editedContent: string) => void;
  className?: string;
}

const typeConfig = {
  outline: {
    title: "Story Outline",
    icon: FileText,
    description: "AI-crafted story structure",
  },
  continuation: {
    title: "Story Continuation",
    icon: Wand2,
    description: "Magic continuation of your narrative",
  },
  expansion: {
    title: "Expanded Text",
    icon: Maximize2,
    description: "Enhanced scene with more detail",
  },
  image: {
    title: "Generated Image",
    icon: Palette,
    description: "Visual illustration for your story",
  },
};

export function ContentApprovalCard({
  type,
  content,
  onApprove,
  onReject,
  onEdit,
  className,
}: ContentApprovalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const { title, icon: Icon, description } = typeConfig[type];
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        "border-accent/40 bg-ai-surface",
        "shadow-md ai-glow",
        "animate-approval-pulse",
        className
      )}
    >
      {/* AI Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-ai" />

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-2xl bg-accent/15 text-accent">
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground font-normal">
                {description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" />
            <span className="text-xs text-accent-foreground font-medium px-2 py-1 rounded-full bg-accent/15">
              AI Generated
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[200px] font-prose text-base leading-relaxed"
              placeholder="Edit the AI-generated content..."
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="size-4 mr-1.5" />
                Save Changes
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Content preview */}
            <div className="relative">
              <div
                className={cn(
                  "p-4 rounded-2xl",
                  "bg-surface border border-border",
                  "max-h-[300px] overflow-y-auto",
                  "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
                )}
              >
                <div className="font-prose text-base text-foreground leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              </div>

              {/* Fade overlay for long content */}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface to-transparent pointer-events-none rounded-b-lg" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                variant="ai"
                onClick={onApprove}
                className="gap-1.5"
              >
                <Check className="size-4" />
                Accept
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
              <Button
                size="sm"
                variant="ghost"
                onClick={onReject}
                className="text-muted-foreground hover:text-destructive gap-1.5"
              >
                <X className="size-4" />
                Reject
              </Button>

              <div className="flex-1" />

              {/* Word count */}
              <span className="text-xs text-muted-foreground tabular-nums">
                {wordCount.toLocaleString()} words
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ContentApprovalCard;
