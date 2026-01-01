"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Check, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  selectedRating?: string;
  onRatingChange?: (rating: string | undefined) => void;
  selectedStatus?: string;
  onStatusChange?: (status: string | undefined) => void;
}

const POPULAR_TAGS = [
  {
    category: "Relationship",
    tags: [
      "Fluff",
      "Angst",
      "Hurt/Comfort",
      "Slow Burn",
      "Enemies to Lovers",
      "Friends to Lovers",
    ],
  },
  {
    category: "Setting",
    tags: [
      "Canon Compliant",
      "AU - Modern",
      "AU - Coffee Shop",
      "AU - College",
      "AU - Soulmate",
      "Canon Divergence",
    ],
  },
  {
    category: "Tone",
    tags: ["Crack", "Humor", "Drama", "Dark", "Sweet", "Bittersweet"],
  },
  {
    category: "Content",
    tags: [
      "First Kiss",
      "Mutual Pining",
      "Established Relationship",
      "Getting Together",
      "Fake Dating",
      "One Shot",
    ],
  },
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

  const hasFilters = selectedTags.length > 0 || selectedRating || selectedStatus;
  const filterCount =
    selectedTags.length + (selectedRating ? 1 : 0) + (selectedStatus ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Clear All */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filterCount} {filterCount === 1 ? "filter" : "filters"}
          </span>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 px-2">
            Clear All
          </Button>
        </div>
      )}

      {/* Rating Filter */}
      {onRatingChange && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Rating</h4>
          <div className="flex flex-wrap gap-1.5">
            {RATINGS.map((rating) => (
              <Badge
                key={rating}
                variant={selectedRating === rating ? "default" : "outline"}
                className="cursor-pointer text-xs transition-colors"
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
          <h4 className="text-sm font-medium text-foreground">Status</h4>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((status) => (
              <Badge
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                className="cursor-pointer text-xs transition-colors"
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
        <div className="space-y-1">
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
                    className="w-full justify-between px-2 py-2 h-auto text-sm hover:bg-secondary"
                  >
                    <span className="font-medium text-foreground">{category}</span>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                    {filteredTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer text-xs transition-colors gap-1",
                            isSelected && "pr-1.5"
                          )}
                          onClick={() => toggleTag(tag)}
                        >
                          {isSelected && <Check className="size-3" />}
                          {tag}
                        </Badge>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="pt-3 border-t border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Active Filters</h4>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="cursor-pointer gap-1 pr-1.5"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="size-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
