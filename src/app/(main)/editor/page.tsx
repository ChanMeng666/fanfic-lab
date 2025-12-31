"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CopilotSidebar } from "@copilotkit/react-ui";
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
  const router = useRouter();
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
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">✨</span>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                FanFic Lab
              </span>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span>✨</span>
                Start a New Story
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Story Title</label>
                <Input
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="My Amazing Fanfic"
                  className="text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fandom</label>
                <Input
                  value={fandomInput}
                  onChange={(e) => setFandomInput(e.target.value)}
                  placeholder="e.g., Harry Potter, Marvel, BTS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Ships (comma-separated)
                </label>
                <Input
                  value={shipsInput}
                  onChange={(e) => setShipsInput(e.target.value)}
                  placeholder="e.g., Drarry, Stucky, Taekook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tags (comma-separated)
                </label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g., Fluff, Slow Burn, Coffee Shop AU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tone</label>
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
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <span className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                FanFic Lab
              </span>
            </Link>
            <span className="text-gray-300">|</span>
            <Input
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              placeholder="Untitled Story"
              className="border-none bg-transparent font-medium w-64 focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Badge variant="secondary">{storyContext.fandom}</Badge>
              {storyContext.ships.map((ship) => (
                <Badge key={ship} variant="outline" className="text-xs">
                  {ship}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <div className="animate-spin h-3 w-3 border-2 border-purple-600 border-t-transparent rounded-full" />
                  Saving...
                </span>
              )}
              {!isSaving && lastSaved && (
                <span className="text-xs text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {hasUnsavedChanges && !isSaving && (
                <span className="text-xs text-orange-500">Unsaved</span>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={saveNow} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Publish
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar - Characters */}
        <aside className="w-72 border-r bg-white dark:bg-gray-900 p-4 overflow-hidden">
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

        {/* CopilotKit Sidebar */}
        <CopilotSidebar
          defaultOpen={false}
          labels={{
            title: "Writing Assistant",
            initial: "How can I help with your story?",
          }}
          className="w-80"
        />
      </div>
    </div>
  );
}
