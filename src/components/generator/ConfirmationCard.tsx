"use client";

import { Sparkles, BookOpen, Users, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StoryRequest } from "@/lib/types/agent-state";

interface ConfirmationCardProps {
  request: StoryRequest;
  onConfirm: () => void;
  onBack: () => void;
  isGenerating?: boolean;
}

export function ConfirmationCard({
  request,
  onConfirm,
  onBack,
  isGenerating,
}: ConfirmationCardProps) {
  return (
    <Card className="border-accent/30 bg-ai-surface ai-glow max-w-lg mx-auto animate-ai-reveal">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-lg">
          <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
            <Sparkles className="size-4" />
          </div>
          <span className="font-display">Ready to Generate</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          I&apos;ll write a{" "}
          <span className="text-foreground font-medium">{request.constraints.length}</span>{" "}
          story about{" "}
          <span className="text-foreground font-medium">{request.cp.join(" & ")}</span>{" "}
          from{" "}
          <span className="text-foreground font-medium">{request.fandom}</span>.
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <span className="text-muted-foreground">Fandom:</span>
            <span className="text-foreground">{request.fandom}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span className="text-muted-foreground">Pairing:</span>
            <span className="text-foreground">{request.cp.join(" x ")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-accent" />
            <span className="text-muted-foreground">Theme:</span>
            <span className="text-foreground">{request.theme}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{request.constraints.length}</Badge>
          <Badge variant="secondary">{request.constraints.rating}</Badge>
          <Badge variant="secondary">{request.constraints.ending} ending</Badge>
          <Badge variant="secondary">{request.constraints.pov} person</Badge>
          <Badge variant="secondary">{request.constraints.language.toUpperCase()}</Badge>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Button
            onClick={onConfirm}
            disabled={isGenerating}
            className="flex-1 gap-1.5"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin size-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate Story
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onBack} disabled={isGenerating}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
