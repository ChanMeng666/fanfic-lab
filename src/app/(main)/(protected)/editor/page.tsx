"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Feather, Sparkles, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SmartEditor, CharacterSidebar } from "@/components/editor";
import { useAutosave } from "@/lib/hooks";
import {
  saveDraft,
  generateDraftId,
  type DraftData,
} from "@/lib/storage/draft-storage";
import type { StoryContext, StoryCharacter } from "@/lib/types/agent-state";

// Default story context for new stories
const DEFAULT_STORY_CONTEXT: StoryContext = {
  fandom: "",
  ships: [],
  tags: [],
  plotPoints: [],
  currentChapter: 1,
  characters: [],
  tone: "neutral",
};

export default function NewEditorPage() {
  const [storyContext, setStoryContext] = useState<StoryContext>(DEFAULT_STORY_CONTEXT);
  const [storyTitle, setStoryTitle] = useState("");
  const [content, setContent] = useState("");
  const [showSetup, setShowSetup] = useState(true);
  const [draftId] = useState(() => generateDraftId());

  // Setup form state
  const [fandomInput, setFandomInput] = useState("");
  const [shipsInput, setShipsInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [toneInput, setToneInput] = useState("neutral");

  // Autosave callback
  const handleAutosave = useCallback(
    async (data: string) => {
      const draft: DraftData = {
        id: draftId,
        title: storyTitle || "Untitled Story",
        content: data,
        fandom: storyContext.fandom,
        ships: storyContext.ships,
        tags: storyContext.tags,
        tone: storyContext.tone,
        characters: storyContext.characters,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      saveDraft(draft);
    },
    [draftId, storyTitle, storyContext]
  );

  // Autosave hook
  const { isSaving, lastSaved, hasUnsavedChanges, saveNow } = useAutosave({
    data: content,
    onSave: handleAutosave,
    interval: 30000, // Save every 30 seconds
    debounce: 2000, // Debounce 2 seconds after typing
    enabled: !showSetup && content.length > 0,
  });

  const handleStartWriting = () => {
    setStoryContext({
      ...storyContext,
      fandom: fandomInput,
      ships: shipsInput.split(",").map((s) => s.trim()).filter(Boolean),
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      tone: toneInput,
    });
    setShowSetup(false);
  };

  const handleAddCharacter = (character: StoryCharacter) => {
    setStoryContext({
      ...storyContext,
      characters: [...storyContext.characters, character],
    });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  if (showSetup) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-surface/80 backdrop-blur-sm">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10">
                <Feather className="size-5 text-primary" />
              </div>
              <span className="text-xl font-display font-bold text-foreground">
                FanFic Lab
              </span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2.5 text-2xl font-display">
                <div className="flex items-center justify-center size-10 rounded-xl bg-accent/15 text-accent">
                  <Sparkles className="size-5" />
                </div>
                Start a New Story
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Story Title
                </label>
                <Input
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="My Amazing Fanfic"
                  className="text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Fandom
                </label>
                <Input
                  value={fandomInput}
                  onChange={(e) => setFandomInput(e.target.value)}
                  placeholder="e.g., Harry Potter, Marvel, BTS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ships (comma-separated)
                </label>
                <Input
                  value={shipsInput}
                  onChange={(e) => setShipsInput(e.target.value)}
                  placeholder="e.g., Drarry, Stucky, Taekook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tags (comma-separated)
                </label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., Fluff, Slow Burn, Coffee Shop AU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tone
                </label>
                <div className="flex flex-wrap gap-2">
                  {["fluff", "angst", "humor", "dark", "romantic", "neutral"].map(
                    (tone) => (
                      <Badge
                        key={tone}
                        variant={toneInput === tone ? "default" : "outline"}
                        className="cursor-pointer capitalize"
                        onClick={() => setToneInput(tone)}
                      >
                        {tone}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  onClick={handleStartWriting}
                  className="flex-1"
                  disabled={!fandomInput}
                >
                  Start Writing
                </Button>
                <Link href="/wizard">
                  <Button variant="outline">Use Creative Wizard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-xl bg-primary/10">
                <Feather className="size-4 text-primary" />
              </div>
              <span className="font-display font-bold text-foreground">
                FanFic Lab
              </span>
            </Link>
            <span className="text-border">|</span>
            <Input
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              placeholder="Untitled Story"
              className="border-none bg-transparent font-medium w-64 focus-visible:ring-0 text-foreground"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{storyContext.fandom}</Badge>
              {storyContext.ships.map((ship) => (
                <Badge key={ship} variant="outline" className="text-xs">
                  {ship}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                  Saving...
                </span>
              )}
              {!isSaving && lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {hasUnsavedChanges && !isSaving && (
                <span className="text-xs text-warning">Unsaved</span>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={saveNow} disabled={isSaving} className="gap-1.5">
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button size="sm" className="gap-1.5">
              <Send className="size-4" />
              Publish
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar - Characters */}
        <aside className="w-72 border-r border-border bg-surface p-4 overflow-hidden">
          <CharacterSidebar
            characters={storyContext.characters}
            onAddCharacter={handleAddCharacter}
          />
        </aside>

        {/* Editor */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <SmartEditor
              storyContext={storyContext}
              initialContent={content}
              onContentChange={handleContentChange}
            />
          </div>
        </main>

      </div>
    </div>
  );
}
