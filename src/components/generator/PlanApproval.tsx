"use client";

import { useState } from "react";
import { Sparkles, Check, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import type { WritingPlan } from "@/lib/types/agent-state";

interface PlanApprovalProps {
  plan: WritingPlan;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanApproval({ plan, onApprove, onReject }: PlanApprovalProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="border-accent/30 bg-ai-surface ai-glow max-w-2xl mx-auto animate-ai-reveal">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
              <Sparkles className="size-4" />
            </div>
            <span className="font-display">Writing Plan</span>
          </span>
          <Badge variant="secondary" className="text-xs gap-1">
            <Sparkles className="size-3" />
            AI Generated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div>
          <h3 className="font-display text-2xl font-bold text-foreground">
            {plan.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{plan.elements}</p>
        </div>

        {/* Emotional Arc */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground">Emotional Arc</span>
          <div className="flex flex-wrap gap-2">
            {plan.emotionalArc.map((beat, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-sm"
              >
                <span className="size-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center font-medium">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{beat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scene Outline */}
        <div className="space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Scene Outline {isExpanded ? "[-]" : "[+]"}
          </button>
          {isExpanded && (
            <div className="space-y-2 pl-2 border-l-2 border-accent/30">
              {plan.sceneOutline.map((scene, i) => (
                <div key={i} className="text-sm text-muted-foreground py-1">
                  <ReactMarkdown>{scene}</ReactMarkdown>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Constraints */}
        {plan.constraints.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plan.constraints.map((c, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {c}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Button size="sm" className="gap-1.5" onClick={onApprove}>
            <Check className="size-3.5" />
            Approve & Write
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5" onClick={onReject}>
            <RefreshCw className="size-3.5" />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
