"use client";

import { useState } from "react";
import { Users, Plus, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { StoryCharacter } from "@/lib/types/agent-state";

interface CharacterSetupProps {
  fandom: string;
  suggestedCharacters?: string[];
  onComplete: (characters: StoryCharacter[]) => void;
}

export function CharacterSetup({
  fandom,
  suggestedCharacters = [],
  onComplete,
}: CharacterSetupProps) {
  const [characters, setCharacters] = useState<StoryCharacter[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    personality: "",
    speechPattern: "",
    isOriginal: false,
  });

  const addCharacterFromSuggestion = (name: string) => {
    const character: StoryCharacter = {
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      fandom,
      personality: [],
      isOriginal: false,
    };
    setCharacters((prev) => [...prev, character]);
  };

  const addCustomCharacter = () => {
    if (!newCharacter.name.trim()) return;

    const character: StoryCharacter = {
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: newCharacter.name.trim(),
      fandom,
      personality: newCharacter.personality
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      speechPattern: newCharacter.speechPattern.trim() || undefined,
      isOriginal: newCharacter.isOriginal,
    };

    setCharacters((prev) => [...prev, character]);
    setNewCharacter({ name: "", personality: "", speechPattern: "", isOriginal: false });
    setShowAddForm(false);
  };

  const removeCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const handleComplete = () => {
    onComplete(characters);
  };

  const remainingSuggestions = suggestedCharacters.filter(
    (name) => !characters.some((c) => c.name === name)
  );

  return (
    <div className="p-4 rounded-2xl bg-ai-surface border border-accent/30 ai-glow space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
          <Users className="size-4" />
        </div>
        <span className="font-display text-lg">Setup Characters</span>
        <Badge variant="secondary" className="ml-2">
          {fandom}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Add the main characters for your story. You can add canon characters or create original ones.
      </p>

      {/* Suggested Characters */}
      {remainingSuggestions.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Suggested characters:
          </label>
          <div className="flex flex-wrap gap-2">
            {remainingSuggestions.map((name) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => addCharacterFromSuggestion(name)}
                className="hover:bg-primary/10 hover:border-primary/30 gap-1"
              >
                <Plus className="size-3.5" />
                {name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Added Characters */}
      {characters.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Your characters ({characters.length}):
          </label>
          <ScrollArea className="h-[150px]">
            <div className="space-y-2">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center justify-between p-2 bg-surface rounded-xl border border-border"
                >
                  <div className="flex items-center gap-2">
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
                    onClick={() => removeCharacter(char.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  >
                    <X className="size-3.5" />
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Add Custom Character Form */}
      {showAddForm ? (
        <div className="space-y-3 p-3 bg-surface rounded-xl border border-border">
          <div>
            <label className="text-sm font-medium text-foreground">Character Name</label>
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
              Personality Traits (comma-separated)
            </label>
            <Input
              value={newCharacter.personality}
              onChange={(e) =>
                setNewCharacter((prev) => ({ ...prev, personality: e.target.value }))
              }
              placeholder="brave, sarcastic, loyal"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Speech Pattern (optional)</label>
            <Textarea
              value={newCharacter.speechPattern}
              onChange={(e) =>
                setNewCharacter((prev) => ({ ...prev, speechPattern: e.target.value }))
              }
              placeholder="How does this character talk?"
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
            <Button onClick={addCustomCharacter} disabled={!newCharacter.name.trim()} className="gap-1.5">
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
          className="w-full gap-1.5"
        >
          <Plus className="size-4" />
          Add Custom Character
        </Button>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border/50">
        <Button
          onClick={handleComplete}
          className="flex-1"
          disabled={characters.length === 0}
        >
          Continue with {characters.length} character{characters.length !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}
