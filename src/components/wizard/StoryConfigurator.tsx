"use client";

import { useState } from "react";
import {
  Settings,
  Heart,
  MapPin,
  Tags,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type ShipType,
  type StorySetting,
  type SourceType,
  SHIP_TYPE_OPTIONS,
  STORY_SETTING_OPTIONS,
} from "@/lib/types/agent-state";

interface StoryConfiguratorProps {
  sourceName: string;
  sourceType: SourceType;
  onComplete: (data: {
    shipType: ShipType;
    setting: StorySetting;
    additionalTags: string[];
  }) => void;
  onBack?: () => void;
}

export function StoryConfigurator({
  sourceName,
  sourceType,
  onComplete,
  onBack,
}: StoryConfiguratorProps) {
  const [selectedShipType, setSelectedShipType] = useState<ShipType | null>(null);
  const [selectedSetting, setSelectedSetting] = useState<StorySetting | null>(null);
  const [additionalTags, setAdditionalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !additionalTags.includes(tag)) {
      setAdditionalTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setAdditionalTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = () => {
    if (selectedShipType && selectedSetting) {
      onComplete({
        shipType: selectedShipType,
        setting: selectedSetting,
        additionalTags,
      });
    }
  };

  const isComplete = selectedShipType !== null && selectedSetting !== null;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8 animate-fade-slide-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <Settings className="size-8" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Configure Your Story
        </h2>
      </div>

      {/* Ship/Relationship Type Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="size-5 text-primary" />
          <h3 className="font-display text-lg font-medium text-foreground">
            Relationship Type
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SHIP_TYPE_OPTIONS.map((option) => {
            const isSelected = selectedShipType === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedShipType(option.id)}
                title={option.description}
                className={cn(
                  "flex items-center justify-center p-3 rounded-xl border text-center transition-all hover-lift",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-surface hover:border-primary/50"
                )}
              >
                <span className="font-medium text-sm text-foreground">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Story Setting Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" />
          <h3 className="font-display text-lg font-medium text-foreground">
            Story Setting
          </h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {STORY_SETTING_OPTIONS.map((option) => {
            const isSelected = selectedSetting === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedSetting(option.id)}
                title={option.description}
                className={cn(
                  "flex items-center justify-center p-3 rounded-xl border text-center transition-all hover-lift",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-surface hover:border-primary/50"
                )}
              >
                <span className="font-medium text-sm text-foreground">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Tags Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tags className="size-4 text-primary" />
          <h3 className="font-medium text-sm text-foreground">
            Tags
          </h3>
          <span className="text-xs text-muted-foreground">(optional)</span>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag..."
              className="flex-1 h-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className="h-9 w-9"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {additionalTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-1 px-2 py-0.5 text-xs"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {["slow burn", "fluff", "angst", "hurt/comfort", "enemies to lovers", "friends to lovers"].map(
              (suggestion) =>
                !additionalTags.includes(suggestion) && (
                  <button
                    key={suggestion}
                    onClick={() => setAdditionalTags((prev) => [...prev, suggestion])}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    +{suggestion}
                  </button>
                )
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button
          onClick={handleSubmit}
          disabled={!isComplete}
          className="gap-2"
        >
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
