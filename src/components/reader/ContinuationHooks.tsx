"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ContinuationHooksProps {
  hooks: string[];
  onSelect: (hook: string) => void;
}

export function ContinuationHooks({ hooks, onSelect }: ContinuationHooksProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-6 rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-3.5" />
        </div>
        <h3 className="text-sm font-medium text-foreground">Continue the Story</h3>
      </div>

      <div className="grid gap-2">
        {hooks.map((hook, i) => (
          <Card
            key={i}
            className="cursor-pointer border-accent/20 hover:border-accent/50 hover:bg-ai-surface transition-all hover-lift"
            onClick={() => onSelect(hook)}
          >
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{hook}</p>
              <ArrowRight className="size-4 text-accent flex-shrink-0" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
