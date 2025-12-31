"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedRating?: string;
  onRatingChange?: (rating: string | undefined) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string | undefined) => void;
}

const POPULAR_TAGS = [
  // Relationship
  { category: "Relationship", tags: ["Fluff", "Angst", "Hurt/Comfort", "Slow Burn", "Enemies to Lovers", "Friends to Lovers"] },
  // Setting
  { category: "Setting", tags: ["Canon Compliant", "AU - Modern", "AU - Coffee Shop", "AU - College", "AU - Soulmate", "Canon Divergence"] },
  // Tone
  { category: "Tone", tags: ["Crack", "Humor", "Drama", "Dark", "Sweet", "Bittersweet"] },
  // Content
  { category: "Content", tags: ["First Kiss", "Mutual Pining", "Established Relationship", "Getting Together", "Fake Dating", "One Shot"] },
];

const RATINGS = ["GENERAL", "TEEN", "MATURE", "EXPLICIT"];
const STATUSES = ["PUBLISHED", "COMPLETE"];

export function TagFilter({
  selectedTags,
  onTagsChange,
  selectedRating,
  onRatingChange,
  selectedStatus,
  onStatusChange,
}: TagFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Relationship"])
  );

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const clearAll = () => {
    onTagsChange([]);
    onRatingChange?.(undefined);
    onStatusChange?.(undefined);
  };

  const hasFilters =
    selectedTags.length > 0 || selectedRating || selectedStatus;

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Search tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="text-sm"
      />

      {/* Clear All */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {selectedTags.length + (selectedRating ? 1 : 0) + (selectedStatus ? 1 : 0)} filters
          </span>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      )}

      {/* Rating Filter */}
      {onRatingChange && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Rating</h4>
          <div className="flex flex-wrap gap-1.5">
            {RATINGS.map((rating) => (
              <Badge
                key={rating}
                variant={selectedRating === rating ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() =>
                  onRatingChange(selectedRating === rating ? undefined : rating)
                }
              >
                {rating}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter */}
      {onStatusChange && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Status</h4>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((status) => (
              <Badge
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() =>
                  onStatusChange(selectedStatus === status ? undefined : status)
                }
              >
                {status === "PUBLISHED" ? "In Progress" : "Complete"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tag Categories */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {POPULAR_TAGS.map(({ category, tags }) => {
            const filteredTags = tags.filter((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            );

            if (searchQuery && filteredTags.length === 0) return null;

            return (
              <Collapsible
                key={category}
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-2 h-auto text-sm"
                  >
                    <span className="font-medium">{category}</span>
                    <span className="text-gray-400">
                      {expandedCategories.has(category) ? "−" : "+"}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 p-2 pt-0">
                    {filteredTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={
                          selectedTags.includes(tag) ? "default" : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() => toggleTag(tag)}
                      >
                        {selectedTags.includes(tag) && "✓ "}
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="pt-2 border-t">
          <h4 className="text-sm font-medium mb-2">Active Filters</h4>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="cursor-pointer bg-purple-600"
                onClick={() => toggleTag(tag)}
              >
                {tag} ✕
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
