"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

  const severityColors = {
    low: "bg-yellow-100 text-yellow-800 border-yellow-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    high: "bg-red-100 text-red-800 border-red-200",
  };

  const issueTypeIcons = {
    dialogue: "💬",
    action: "🏃",
    emotion: "💭",
    behavior: "🎭",
  };

  if (isChecking) {
    return (
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-orange-600 border-t-transparent rounded-full" />
            <span className="text-orange-700">Checking for OOC moments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-3 text-green-700">
            <span className="text-2xl">✓</span>
            <span>No out-of-character moments detected!</span>
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
    <Card className="border-orange-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <span>🎭</span>
            OOC Check Results
            <Badge variant="secondary">{results.length} issues</Badge>
          </span>
          {onClear && (
            <Button size="sm" variant="ghost" onClick={onClear}>
              Clear
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {Object.entries(groupedByCharacter).map(([characterName, issues]) => (
              <Collapsible
                key={characterName}
                open={expandedIssues.has(characterName)}
                onOpenChange={() => toggleExpanded(characterName)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-3 h-auto"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{characterName}</span>
                      <Badge variant="outline">{issues.length} issues</Badge>
                    </span>
                    <span className="text-gray-400">
                      {expandedIssues.has(characterName) ? "−" : "+"}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 pl-3 pt-2">
                    {issues.map((issue, idx) => (
                      <Card
                        key={`${issue.characterId}-${idx}`}
                        className={`${severityColors[issue.severity]} border`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span>{issueTypeIcons[issue.issueType]}</span>
                            <span className="capitalize font-medium">
                              {issue.issueType}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                issue.severity === "high"
                                  ? "border-red-400"
                                  : issue.severity === "medium"
                                  ? "border-orange-400"
                                  : "border-yellow-400"
                              }`}
                            >
                              {issue.severity}
                            </Badge>
                          </div>

                          <div className="bg-white/50 rounded p-2 text-sm italic">
                            "{issue.excerpt}"
                          </div>

                          <p className="text-sm">{issue.explanation}</p>

                          <div className="bg-white/80 rounded p-2 text-sm">
                            <span className="font-medium">Suggestion: </span>
                            {issue.suggestion}
                          </div>

                          <div className="flex gap-2 pt-1">
                            {onApplySuggestion && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => onApplySuggestion(issue)}
                              >
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
                    ))}
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
