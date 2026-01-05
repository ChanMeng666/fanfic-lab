"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  X,
  UserPlus,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type {
  StoryCharacter,
  SourceResearchData,
  ResearchCharacter,
} from "@/lib/types/agent-state";

interface CharacterSetupV2Props {
  sourceName: string;
  researchData: SourceResearchData;
  onComplete: (characters: StoryCharacter[]) => void;
  onBack?: () => void;
}

interface CharacterCardProps {
  character: ResearchCharacter;
  isSelected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function ResearchedCharacterCard({
  character,
  isSelected,
  onToggle,
  onEdit,
}: CharacterCardProps) {
  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border transition-all cursor-pointer hover-lift",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-surface hover:border-primary/50"
      )}
      onClick={onToggle}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 flex items-center justify-center size-6 rounded-full transition-all",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isSelected && <Check className="size-4" />}
      </div>

      {/* Character info */}
      <div className="pr-8">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-medium text-foreground">{character.name}</h4>
          <Badge variant="secondary" className="text-xs gap-1">
            <Sparkles className="size-3" />
            From Research
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {character.description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {character.traits.slice(0, 4).map((trait, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {trait}
            </Badge>
          ))}
          {character.traits.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{character.traits.length - 4} more
            </Badge>
          )}
        </div>
      </div>

      {/* Edit button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute bottom-3 right-3 h-7 px-2 text-xs"
      >
        <Edit2 className="size-3 mr-1" />
        Edit
      </Button>
    </div>
  );
}

export function CharacterSetupV2({
  sourceName,
  researchData,
  onComplete,
  onBack,
}: CharacterSetupV2Props) {
  // Track selected characters from research
  const [selectedFromResearch, setSelectedFromResearch] = useState<Set<string>>(
    new Set(researchData.mainCharacters.map((c) => c.name))
  );

  // Custom characters added by user
  const [customCharacters, setCustomCharacters] = useState<StoryCharacter[]>([]);

  // Add character form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    personality: "",
    speechPattern: "",
    isOriginal: false,
  });

  // Convert research characters to StoryCharacters
  const researchCharactersAsStory = useMemo(() => {
    return researchData.mainCharacters
      .filter((rc) => selectedFromResearch.has(rc.name))
      .map(
        (rc): StoryCharacter => ({
          id: `research_${rc.name.replace(/\s+/g, "_").toLowerCase()}`,
          name: rc.name,
          fandom: sourceName,
          personality: rc.traits,
          isOriginal: false,
        })
      );
  }, [researchData.mainCharacters, selectedFromResearch, sourceName]);

  // All selected characters
  const allCharacters = [...researchCharactersAsStory, ...customCharacters];

  const toggleResearchCharacter = (name: string) => {
    setSelectedFromResearch((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const addCustomCharacter = () => {
    if (!newCharacter.name.trim()) return;

    const character: StoryCharacter = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newCharacter.name.trim(),
      fandom: sourceName,
      personality: newCharacter.personality
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      speechPattern: newCharacter.speechPattern.trim() || undefined,
      isOriginal: newCharacter.isOriginal,
    };

    setCustomCharacters((prev) => [...prev, character]);
    setNewCharacter({ name: "", personality: "", speechPattern: "", isOriginal: false });
    setShowAddForm(false);
  };

  const removeCustomCharacter = (id: string) => {
    setCustomCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const handleComplete = () => {
    onComplete(allCharacters);
  };

  const handleEditResearchCharacter = (name: string) => {
    // For now, just toggle - in future could open edit modal
    setEditingCharacter(name);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6 animate-fade-slide-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-primary/10 text-primary mb-4">
          <Users className="size-8" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Select Characters
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose characters for your{" "}
          <span className="text-primary font-medium">{sourceName}</span> story
        </p>
      </div>

      {/* Research Characters */}
      {researchData.mainCharacters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <h3 className="font-medium text-foreground">
                Characters from Research
              </h3>
            </div>
            <span className="text-sm text-muted-foreground">
              {selectedFromResearch.size} of {researchData.mainCharacters.length} selected
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {researchData.mainCharacters.map((char) => (
              <ResearchedCharacterCard
                key={char.name}
                character={char}
                isSelected={selectedFromResearch.has(char.name)}
                onToggle={() => toggleResearchCharacter(char.name)}
                onEdit={() => handleEditResearchCharacter(char.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Characters */}
      {customCharacters.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-foreground flex items-center gap-2">
            <UserPlus className="size-4" />
            Custom Characters
          </h3>
          <div className="space-y-2">
            {customCharacters.map((char) => (
              <div
                key={char.id}
                className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{char.name}</span>
                  {char.isOriginal && (
                    <Badge variant="secondary" className="text-xs">
                      OC
                    </Badge>
                  )}
                  {char.personality.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({char.personality.slice(0, 2).join(", ")}
                      {char.personality.length > 2 && "..."})
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomCharacter(char.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Character Form */}
      {showAddForm ? (
        <div className="space-y-4 p-4 rounded-xl border border-border bg-surface">
          <h4 className="font-medium text-foreground">Add Custom Character</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">
                Character Name *
              </label>
              <Input
                value={newCharacter.name}
                onChange={(e) =>
                  setNewCharacter((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter character name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">
                Personality Traits
              </label>
              <Input
                value={newCharacter.personality}
                onChange={(e) =>
                  setNewCharacter((prev) => ({ ...prev, personality: e.target.value }))
                }
                placeholder="brave, sarcastic, loyal (comma-separated)"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Speech Pattern (optional)
            </label>
            <Textarea
              value={newCharacter.speechPattern}
              onChange={(e) =>
                setNewCharacter((prev) => ({ ...prev, speechPattern: e.target.value }))
              }
              placeholder="How does this character talk? Any verbal tics or patterns?"
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="isOC"
              checked={newCharacter.isOriginal}
              onCheckedChange={(checked) =>
                setNewCharacter((prev) => ({ ...prev, isOriginal: checked === true }))
              }
            />
            <label htmlFor="isOC" className="text-sm text-foreground">
              Original Character (OC)
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={addCustomCharacter}
              disabled={!newCharacter.name.trim()}
              className="gap-1.5"
            >
              <UserPlus className="size-4" />
              Add Character
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="w-full gap-2"
        >
          <Plus className="size-4" />
          Add Custom Character / OC
        </Button>
      )}

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
          onClick={handleComplete}
          disabled={allCharacters.length === 0}
          className="gap-2"
        >
          Continue with {allCharacters.length} character
          {allCharacters.length !== 1 ? "s" : ""}
          <ArrowRight className="size-4" />
        </Button>
      </div>

      {/* Help Text */}
      {allCharacters.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Please select at least one character to continue
        </p>
      )}
    </div>
  );
}
