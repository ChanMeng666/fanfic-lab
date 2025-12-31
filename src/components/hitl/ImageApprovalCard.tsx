"use client";

import { useState } from "react";
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

  const typeLabels = {
    portrait: { title: "Character Portrait", icon: "🎨", color: "purple" },
    illustration: { title: "Scene Illustration", icon: "🖼️", color: "blue" },
    cover: { title: "Story Cover", icon: "📚", color: "pink" },
  };

  const { title, icon, color } = typeLabels[type];

  const handleRegenerate = () => {
    onRegenerate?.(modifiedPrompt);
    setShowPromptEdit(false);
  };

  if (isGenerating) {
    return (
      <Card className={`border-2 border-${color}-200 bg-${color}-50/50`}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-pulse w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
              <span className="text-4xl animate-bounce">{icon}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
              <span className="text-gray-600">Generating {title.toLowerCase()}...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-${color}-200 bg-${color}-50/50`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <span>{icon}</span>
            {title}
            {characterName && (
              <Badge variant="secondary" className="ml-2">
                {characterName}
              </Badge>
            )}
          </span>
          <span className="text-xs font-normal text-gray-500">
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
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-sm underline"
                >
                  View Full Size
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No image generated</span>
            </div>
          </div>
        )}

        {/* Prompt Display/Edit */}
        {showPromptEdit ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Modify prompt:</label>
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
          <div className="bg-white/80 rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Prompt:</span>
              {onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => setShowPromptEdit(true)}
                >
                  Edit
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-700 italic">"{prompt}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            size="sm"
            onClick={onApprove}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            disabled={!imageUrl}
          >
            Save Image
          </Button>
          {onRegenerate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPromptEdit(true)}
            >
              Modify & Regenerate
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onReject}>
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
