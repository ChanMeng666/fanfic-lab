"use client";

import { useState } from "react";
import {
  Theater,
  Check,
  MessageSquare,
  Footprints,
  Brain,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface OOCIssue {
  characterId: string;
  characterName: string;
  issueType: "dialogue" | "action" | "emotion" | "behavior";
  excerpt: string;
  explanation: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
}

interface OOCCheckerProps {
  results: OOCIssue[];
  isChecking?: boolean;
  onApplySuggestion?: (issue: OOCIssue) => void;
  onDismiss?: (issue: OOCIssue) => void;
  onClear?: () => void;
}

const issueTypeIcons = {
  dialogue: MessageSquare,
  action: Footprints,
  emotion: Brain,
  behavior: Theater,
};

const severityStyles = {
  low: {
    badge: "bg-warning/10 text-warning border-warning/30",
    card: "border-warning/30 bg-warning/5",
  },
  medium: {
    badge: "bg-accent/10 text-accent-foreground border-accent/30",
    card: "border-accent/30 bg-accent/5",
  },
  high: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    card: "border-destructive/30 bg-destructive/5",
  },
};

export function OOCChecker({
  results,
  isChecking = false,
  onApplySuggestion,
  onDismiss,
  onClear,
}: OOCCheckerProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIssues((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (isChecking) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-warning border-t-transparent rounded-full" />
            <span className="text-warning font-medium">Checking for OOC moments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-3 text-success">
            <Check className="size-6" />
            <span className="font-medium">No out-of-character moments detected!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by character
  const groupedByCharacter = results.reduce<Record<string, OOCIssue[]>>(
    (acc, issue) => {
      if (!acc[issue.characterName]) {
        acc[issue.characterName] = [];
      }
      acc[issue.characterName].push(issue);
      return acc;
    },
    {}
  );

  return (
    <Card className="border-warning/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-warning/15 text-warning">
              <Theater className="size-4" />
            </div>
            OOC Check Results
            <Badge variant="secondary">{results.length} issues</Badge>
          </span>
          {onClear && (
            <Button size="sm" variant="ghost" onClick={onClear} className="gap-1.5">
              <X className="size-4" />
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {Object.entries(groupedByCharacter).map(([characterName, issues]) => (
              <Collapsible
                key={characterName}
                open={expandedIssues.has(characterName)}
                onOpenChange={() => toggleExpanded(characterName)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{characterName}</span>
                      <Badge variant="outline">{issues.length} issues</Badge>
                    </span>
                    {expandedIssues.has(characterName) ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 pl-3 pt-2">
                    {issues.map((issue, idx) => {
                      const IssueIcon = issueTypeIcons[issue.issueType];
                      return (
                        <Card
                          key={`${issue.characterId}-${idx}`}
                          className={cn("border", severityStyles[issue.severity].card)}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <IssueIcon className="size-4" />
                              <span className="capitalize font-medium text-foreground">
                                {issue.issueType}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn("text-xs", severityStyles[issue.severity].badge)}
                              >
                                <AlertTriangle className="size-3 mr-1" />
                                {issue.severity}
                              </Badge>
                            </div>

                            <div className="bg-surface rounded-lg p-2 text-sm italic text-muted-foreground border border-border">
                              "{issue.excerpt}"
                            </div>

                            <p className="text-sm text-foreground">{issue.explanation}</p>

                            <div className="bg-success/10 border border-success/20 rounded-lg p-2 text-sm">
                              <span className="font-medium text-success">Suggestion: </span>
                              <span className="text-foreground">{issue.suggestion}</span>
                            </div>

                            <div className="flex gap-2 pt-1">
                              {onApplySuggestion && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1.5"
                                  onClick={() => onApplySuggestion(issue)}
                                >
                                  <Check className="size-3.5" />
                                  Apply Fix
                                </Button>
                              )}
                              {onDismiss && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs"
                                  onClick={() => onDismiss(issue)}
                                >
                                  Dismiss
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
