"use client";

import { useState } from "react";
import { ClipboardList, Check, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface OutlineApprovalCardProps {
  outline: string;
  onApprove: () => void;
  onReject: () => void;
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

  const handleSaveEdit = () => {
    onEdit?.(editedOutline);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedOutline(outline);
    setIsEditing(false);
  };

  // Parse outline into sections
  const sections = outline.split(/\n(?=Chapter |Act |Scene |Part )/gi);

  return (
    <Card className="border-accent/30 bg-ai-surface ai-glow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-2xl bg-accent/15 text-accent">
              <ClipboardList className="size-4" />
            </div>
            <span className="font-display">Story Outline</span>
          </span>
          <Badge variant="secondary" className="text-xs gap-1">
            <Sparkles className="size-3" />
            AI Generated - Review before accepting
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
        ) : (
          <>
            <div className="prose prose-sm max-w-none mb-4 max-h-[400px] overflow-y-auto">
              <div className="space-y-4">
                {sections.map((section, idx) => {
                  const lines = section.trim().split("\n");
                  const title = lines[0];
                  const content = lines.slice(1).join("\n").trim();
                  const isChapter = /^(Chapter|Act|Scene|Part)/i.test(title);

                  return (
                    <div
                      key={idx}
                      className={`${
                        isChapter ? "border-l-2 border-primary pl-3" : ""
                      }`}
                    >
                      {isChapter && (
                        <h3 className="font-semibold text-primary mb-1">
                          {title}
                        </h3>
                      )}
                      <p className="text-foreground whitespace-pre-wrap text-sm">
                        {isChapter ? content : section}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border">
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
              <Button size="sm" variant="ghost" onClick={onReject} className="gap-1.5">
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
              <div className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {sections.length} sections
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
