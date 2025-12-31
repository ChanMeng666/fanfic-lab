"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StoryCharacter } from "@/lib/types/agent-state";

interface CharacterSidebarProps {
  characters: StoryCharacter[];
  onAddCharacter?: (character: StoryCharacter) => void;
  onEditCharacter?: (character: StoryCharacter) => void;
  onRemoveCharacter?: (characterId: string) => void;
}

export function CharacterSidebar({
  characters,
  onAddCharacter,
  onEditCharacter,
  onRemoveCharacter,
}: CharacterSidebarProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCharacter, setNewCharacter] = useState<Partial<StoryCharacter>>({
    name: "",
    fandom: "",
    personality: [],
    isOriginal: false,
  });
  const [personalityInput, setPersonalityInput] = useState("");

  const handleAddCharacter = () => {
    if (!newCharacter.name) return;

    const character: StoryCharacter = {
      id: `char_${Date.now()}`,
      name: newCharacter.name,
      fandom: newCharacter.fandom || "",
      personality: personalityInput.split(",").map((t) => t.trim()).filter(Boolean),
      speechPattern: newCharacter.speechPattern,
      isOriginal: newCharacter.isOriginal,
    };

    onAddCharacter?.(character);
    setNewCharacter({ name: "", fandom: "", personality: [], isOriginal: false });
    setPersonalityInput("");
    setIsAddDialogOpen(false);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <span>🎭</span>
            Characters
          </span>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                + Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Character</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newCharacter.name}
                    onChange={(e) =>
                      setNewCharacter({ ...newCharacter, name: e.target.value })
                    }
                    placeholder="Character name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Fandom</label>
                  <Input
                    value={newCharacter.fandom}
                    onChange={(e) =>
                      setNewCharacter({ ...newCharacter, fandom: e.target.value })
                    }
                    placeholder="e.g., Harry Potter, Marvel"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Personality Traits (comma-separated)
                  </label>
                  <Input
                    value={personalityInput}
                    onChange={(e) => setPersonalityInput(e.target.value)}
                    placeholder="brave, sarcastic, loyal"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Speech Pattern</label>
                  <Textarea
                    value={newCharacter.speechPattern || ""}
                    onChange={(e) =>
                      setNewCharacter({
                        ...newCharacter,
                        speechPattern: e.target.value,
                      })
                    }
                    placeholder="How does this character talk? Any verbal tics, catchphrases?"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isOriginal"
                    checked={newCharacter.isOriginal}
                    onChange={(e) =>
                      setNewCharacter({
                        ...newCharacter,
                        isOriginal: e.target.checked,
                      })
                    }
                  />
                  <label htmlFor="isOriginal" className="text-sm">
                    Original Character (OC)
                  </label>
                </div>
                <Button onClick={handleAddCharacter} className="w-full">
                  Add Character
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {characters.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl block mb-2">🎭</span>
              <p className="text-sm">No characters yet</p>
              <p className="text-xs">Add characters to help the AI maintain consistency</p>
            </div>
          ) : (
            <div className="space-y-3">
              {characters.map((character) => (
                <Card key={character.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      {character.portraitUrl ? (
                        <AvatarImage src={character.portraitUrl} alt={character.name} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                        {character.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {character.name}
                        </span>
                        {character.isOriginal && (
                          <Badge variant="secondary" className="text-xs">
                            OC
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {character.fandom}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {character.personality.slice(0, 3).map((trait) => (
                          <Badge
                            key={trait}
                            variant="outline"
                            className="text-xs py-0"
                          >
                            {trait}
                          </Badge>
                        ))}
                        {character.personality.length > 3 && (
                          <Badge variant="outline" className="text-xs py-0">
                            +{character.personality.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
