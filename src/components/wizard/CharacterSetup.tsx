"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>🎭</span>
          Setup Characters
          <Badge variant="secondary" className="ml-2">
            {fandom}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Add the main characters for your story. You can add canon characters or create original ones.
        </p>

        {/* Suggested Characters */}
        {remainingSuggestions.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Suggested characters:
            </label>
            <div className="flex flex-wrap gap-2">
              {remainingSuggestions.map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  onClick={() => addCharacterFromSuggestion(name)}
                  className="hover:bg-blue-100"
                >
                  + {name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Added Characters */}
        {characters.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Your characters ({characters.length}):
            </label>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{char.name}</span>
                      {char.isOriginal && (
                        <Badge variant="secondary" className="text-xs">
                          OC
                        </Badge>
                      )}
                      {char.personality.length > 0 && (
                        <span className="text-xs text-gray-500">
                          ({char.personality.slice(0, 2).join(", ")}
                          {char.personality.length > 2 && "..."})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCharacter(char.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
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
          <div className="space-y-3 p-3 bg-white rounded-lg border">
            <div>
              <label className="text-sm font-medium">Character Name</label>
              <Input
                value={newCharacter.name}
                onChange={(e) =>
                  setNewCharacter((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter character name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Personality Traits (comma-separated)
              </label>
              <Input
                value={newCharacter.personality}
                onChange={(e) =>
                  setNewCharacter((prev) => ({ ...prev, personality: e.target.value }))
                }
                placeholder="brave, sarcastic, loyal"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Speech Pattern (optional)</label>
              <Textarea
                value={newCharacter.speechPattern}
                onChange={(e) =>
                  setNewCharacter((prev) => ({ ...prev, speechPattern: e.target.value }))
                }
                placeholder="How does this character talk?"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isOC"
                checked={newCharacter.isOriginal}
                onChange={(e) =>
                  setNewCharacter((prev) => ({ ...prev, isOriginal: e.target.checked }))
                }
              />
              <label htmlFor="isOC" className="text-sm">
                Original Character (OC)
              </label>
            </div>
            <div className="flex gap-2">
              <Button onClick={addCustomCharacter} disabled={!newCharacter.name.trim()}>
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
            className="w-full"
          >
            + Add Custom Character
          </Button>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            onClick={handleComplete}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            disabled={characters.length === 0}
          >
            Continue with {characters.length} character{characters.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
