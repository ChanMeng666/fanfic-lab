"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ContentApprovalCardProps {
  type: "outline" | "continuation" | "expansion" | "image";
  content: string;
  onApprove: () => void;
  onReject: () => void;
  onEdit?: (editedContent: string) => void;
}

export function ContentApprovalCard({
  type,
  content,
  onApprove,
  onReject,
  onEdit,
}: ContentApprovalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const typeLabels = {
    outline: { title: "Story Outline", icon: "📋", color: "purple" },
    continuation: { title: "Story Continuation", icon: "🪄", color: "blue" },
    expansion: { title: "Expanded Text", icon: "📝", color: "green" },
    image: { title: "Generated Image", icon: "🎨", color: "pink" },
  };

  const { title, icon, color } = typeLabels[type];

  const handleSaveEdit = () => {
    onEdit?.(editedContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <Card className={`border-2 border-${color}-200 bg-${color}-50/50`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <span>{icon}</span>
            {title}
          </span>
          <span className="text-xs font-normal text-gray-500">
            AI Generated - Review before accepting
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[200px] font-serif"
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
            <div className="prose prose-sm max-w-none mb-4 max-h-[300px] overflow-y-auto">
              <div className="whitespace-pre-wrap font-serif text-gray-700 dark:text-gray-300 leading-relaxed">
                {content}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit First
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject}>
                Reject
              </Button>
              <div className="flex-1" />
              <span className="text-xs text-gray-500">
                {content.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
