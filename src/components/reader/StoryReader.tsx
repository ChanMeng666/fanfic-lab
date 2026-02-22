"use client";

import { useState } from "react";
import { BookOpen, Sparkles, ChevronDown, ChevronUp, RotateCcw, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContinuationHooks } from "./ContinuationHooks";
import type { StoryDeliverable } from "@/lib/types/agent-state";

interface StoryReaderProps {
  deliverable: StoryDeliverable;
  onRestart?: () => void;
  onContinue?: (hook: string) => void;
}

export function StoryReader({ deliverable, onRestart, onContinue }: StoryReaderProps) {
  const [showPlan, setShowPlan] = useState(false);
  const [showElements, setShowElements] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-slide-in">
      {/* Title Section */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
            <BookOpen className="size-4" />
          </div>
          <Badge variant="secondary" className="text-xs gap-1">
            <Sparkles className="size-3" />
            AI Generated
          </Badge>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          {deliverable.title}
        </h1>

        {/* Metadata */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="size-3.5" />
            {deliverable.metadata.wordCount.toLocaleString()} words
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {Math.round(deliverable.metadata.generationTimeMs / 1000)}s
          </span>
          <Badge variant="outline" className="text-xs">
            {deliverable.metadata.rating}
          </Badge>
        </div>
      </div>

      {/* Elements Summary - Collapsible */}
      {deliverable.elements && (
        <button
          onClick={() => setShowElements(!showElements)}
          className="w-full text-left px-4 py-2 rounded-lg bg-surface border border-border hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Story Elements</span>
            {showElements ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
          {showElements && (
            <p className="text-sm text-muted-foreground mt-2">{deliverable.elements}</p>
          )}
        </button>
      )}

      {/* Writing Plan - Collapsible */}
      {deliverable.writingPlan && (
        <button
          onClick={() => setShowPlan(!showPlan)}
          className="w-full text-left px-4 py-2 rounded-lg bg-ai-surface border border-accent/20 hover:bg-accent/10 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-accent flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Writing Plan
            </span>
            {showPlan ? <ChevronUp className="size-4 text-accent" /> : <ChevronDown className="size-4 text-accent" />}
          </div>
          {showPlan && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{deliverable.writingPlan}</p>
          )}
        </button>
      )}

      {/* Story Body */}
      <Card className="border-border">
        <CardContent className="p-6 md:p-8">
          <div className="font-prose text-base leading-relaxed text-foreground whitespace-pre-wrap">
            {deliverable.body}
          </div>
        </CardContent>
      </Card>

      {/* Continuation Hooks */}
      {deliverable.continuationHooks.length > 0 && onContinue && (
        <ContinuationHooks
          hooks={deliverable.continuationHooks}
          onSelect={onContinue}
        />
      )}

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-4">
        {onRestart && (
          <Button variant="outline" onClick={onRestart} className="gap-1.5">
            <RotateCcw className="size-4" />
            Generate Another
          </Button>
        )}
      </div>
    </div>
  );
}
