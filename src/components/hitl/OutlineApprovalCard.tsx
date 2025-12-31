"use client";

import { useState } from "react";
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
    <Card className="border-2 border-green-200 bg-green-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <span>📋</span>
            Story Outline
          </span>
          <Badge variant="secondary" className="text-xs">
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
              <Button size="sm" onClick={handleSaveEdit}>
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
                        isChapter ? "border-l-2 border-green-400 pl-3" : ""
                      }`}
                    >
                      {isChapter && (
                        <h3 className="font-semibold text-green-700 mb-1">
                          {title}
                        </h3>
                      )}
                      <p className="text-gray-700 whitespace-pre-wrap text-sm">
                        {isChapter ? content : section}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t">
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                Accept Outline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                Edit First
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject}>
                Regenerate
              </Button>
              <div className="flex-1" />
              <span className="text-xs text-gray-500">
                {sections.length} sections
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
