"use client";

import { useState } from "react";
import { User, ImageIcon, Book, Check, Pencil, Trash2, Sparkles, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface ImageApprovalCardProps {
  type: "portrait" | "illustration" | "cover";
  prompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  characterName?: string;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate?: (modifiedPrompt: string) => void;
}

const typeConfig = {
  portrait: {
    title: "Character Portrait",
    icon: User,
    color: "primary" as const
  },
  illustration: {
    title: "Scene Illustration",
    icon: ImageIcon,
    color: "accent" as const
  },
  cover: {
    title: "Story Cover",
    icon: Book,
    color: "primary" as const
  },
};

export function ImageApprovalCard({
  type,
  prompt,
  imageUrl,
  isGenerating = false,
  characterName,
  onApprove,
  onReject,
  onRegenerate,
}: ImageApprovalCardProps) {
  const [showPromptEdit, setShowPromptEdit] = useState(false);
  const [modifiedPrompt, setModifiedPrompt] = useState(prompt);

  const { title, icon: Icon } = typeConfig[type];

  const handleRegenerate = () => {
    onRegenerate?.(modifiedPrompt);
    setShowPromptEdit(false);
  };

  if (isGenerating) {
    return (
      <Card className="border-accent/30 bg-ai-surface ai-glow">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-pulse w-48 h-48 bg-secondary rounded-lg flex items-center justify-center">
              <Icon className="size-12 text-muted-foreground animate-bounce" />
            </div>
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
              <span className="text-muted-foreground">Generating {title.toLowerCase()}...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30 bg-ai-surface ai-glow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
              <Icon className="size-4" />
            </div>
            <span className="font-display">{title}</span>
            {characterName && (
              <Badge variant="secondary" className="ml-2">
                {characterName}
              </Badge>
            )}
          </span>
          <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3" />
            AI Generated - Review before saving
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Display */}
        {imageUrl ? (
          <div className="flex justify-center">
            <div className="relative group">
              <img
                src={imageUrl}
                alt={`Generated ${type}`}
                className="max-w-full max-h-[400px] rounded-lg shadow-lg object-contain"
              />
              <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-background text-sm flex items-center gap-1.5 hover:underline"
                >
                  <ExternalLink className="size-4" />
                  View Full Size
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image generated</span>
            </div>
          </div>
        )}

        {/* Prompt Display/Edit */}
        {showPromptEdit ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Modify prompt:</label>
            <Textarea
              value={modifiedPrompt}
              onChange={(e) => setModifiedPrompt(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRegenerate}>
                Regenerate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setModifiedPrompt(prompt);
                  setShowPromptEdit(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-lg p-3 border border-border">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Prompt:</span>
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 gap-1"
                  onClick={() => setShowPromptEdit(true)}
                >
                  <Pencil className="size-3" />
                  Edit
                </Button>
              )}
            </div>
            <p className="text-sm text-foreground italic">"{prompt}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            onClick={onApprove}
            className="gap-1.5"
            disabled={!imageUrl}
          >
            <Check className="size-3.5" />
            Save Image
          </Button>
          {onRegenerate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPromptEdit(true)}
              className="gap-1.5"
            >
              <Pencil className="size-3.5" />
              Modify & Regenerate
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onReject} className="gap-1.5">
            <Trash2 className="size-3.5" />
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
