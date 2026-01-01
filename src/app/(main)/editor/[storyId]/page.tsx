"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SmartEditor, CharacterSidebar } from "@/components/editor";
import { useStory, useAutosave } from "@/lib/hooks";
import { updateStory, updateChapter, publishStory } from "@/lib/actions/story";
import type { StoryContext, StoryCharacter } from "@/lib/types/agent-state";
import { toast } from "sonner";

interface EditStoryPageProps {
  params: Promise<{ storyId: string }>;
}

export default function EditStoryPage({ params }: EditStoryPageProps) {
  const { storyId } = use(params);
  const router = useRouter();
  const { story, loading, error, refetch } = useStory(storyId);

  const [storyContext, setStoryContext] = useState<StoryContext | null>(null);
  const [storyTitle, setStoryTitle] = useState("");
  const [content, setContent] = useState("");
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Initialize state when story loads
  useEffect(() => {
    if (story) {
      setStoryTitle(story.title);
      setStoryContext({
        fandom: story.fandom,
        ships: story.ships,
        tags: story.tags,
        plotPoints: [],
        currentChapter: story.chapters[0]?.chapterNumber || 1,
        characters: [],
        tone: "neutral",
      });

      // Set first chapter content
      if (story.chapters.length > 0) {
        const firstChapter = story.chapters[0];
        setContent(firstChapter.content);
        setCurrentChapterId(firstChapter.id);
      }
    }
  }, [story]);

  // Autosave callback
  const handleAutosave = useCallback(
    async (data: string) => {
      if (!currentChapterId) return;

      try {
        await updateChapter({
          id: currentChapterId,
          content: data,
        });
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    },
    [currentChapterId]
  );

  // Autosave hook
  const { isSaving, lastSaved, hasUnsavedChanges, saveNow } = useAutosave({
    data: content,
    onSave: handleAutosave,
    interval: 30000,
    debounce: 2000,
    enabled: !!currentChapterId && content.length > 0,
  });

  const handleTitleSave = async () => {
    if (!story || storyTitle === story.title) return;

    setIsSavingTitle(true);
    try {
      await updateStory({
        id: story.id,
        title: storyTitle,
      });
      toast.success("Title updated");
    } catch (err) {
      toast.error("Failed to update title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleAddCharacter = (character: StoryCharacter) => {
    if (!storyContext) return;
    setStoryContext({
      ...storyContext,
      characters: [...storyContext.characters, character],
    });
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handlePublish = async () => {
    if (!story) return;

    setIsPublishing(true);
    try {
      await publishStory(story.id);
      toast.success("Story published successfully!");
      setShowPublishDialog(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleChapterChange = (chapterId: string) => {
    const chapter = story?.chapters.find((c) => c.id === chapterId);
    if (chapter) {
      // Save current chapter first
      if (hasUnsavedChanges) {
        saveNow();
      }
      setContent(chapter.content);
      setCurrentChapterId(chapter.id);
      if (storyContext) {
        setStoryContext({
          ...storyContext,
          currentChapter: chapter.chapterNumber,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-50">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </header>
        <div className="flex h-[calc(100vh-56px)]">
          <aside className="w-72 border-r bg-white dark:bg-gray-900 p-4">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-24 w-full" />
          </aside>
          <main className="flex-1 p-6">
            <div className="max-w-3xl mx-auto">
              <Skeleton className="h-[600px] w-full" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !story || !storyContext) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Story Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || "The story you're looking for doesn't exist or you don't have access."}
          </p>
          <Link href="/profile">
            <Button>Go to My Stories</Button>
          </Link>
        </div>
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
              onBlur={handleTitleSave}
              placeholder="Untitled Story"
              className="border-none bg-transparent font-medium w-64 focus-visible:ring-0"
              disabled={isSavingTitle}
            />
            {isSavingTitle && (
              <span className="text-xs text-gray-500">Saving title...</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Story metadata */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Badge variant="secondary">{storyContext.fandom}</Badge>
              {storyContext.ships.slice(0, 2).map((ship) => (
                <Badge key={ship} variant="outline" className="text-xs">
                  {ship}
                </Badge>
              ))}
              <Badge
                variant={story.status === "PUBLISHED" ? "default" : "secondary"}
                className="text-xs"
              >
                {story.status}
              </Badge>
            </div>

            {/* Save status */}
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

            {/* Actions */}
            <Button size="sm" variant="outline" onClick={saveNow} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
            {story.status === "DRAFT" && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                onClick={() => setShowPublishDialog(true)}
              >
                Publish
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Chapter tabs (if multiple chapters) */}
      {story.chapters.length > 1 && (
        <div className="border-b bg-white/50 dark:bg-gray-900/50 px-4">
          <div className="container mx-auto flex gap-1 overflow-x-auto py-2">
            {story.chapters.map((chapter) => (
              <Button
                key={chapter.id}
                variant={currentChapterId === chapter.id ? "default" : "ghost"}
                size="sm"
                onClick={() => handleChapterChange(chapter.id)}
                className="shrink-0"
              >
                Ch. {chapter.chapterNumber}
                {chapter.title && `: ${chapter.title.slice(0, 20)}...`}
              </Button>
            ))}
          </div>
        </div>
      )}

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

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Story</DialogTitle>
            <DialogDescription>
              Are you ready to share your story with the world? Once published, your
              story will be visible in the Fandom Feed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Title:</span>
                <span className="font-medium">{storyTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fandom:</span>
                <span className="font-medium">{storyContext.fandom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Chapters:</span>
                <span className="font-medium">{story.chapters.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Word Count:</span>
                <span className="font-medium">
                  {story.chapters.reduce((sum, ch) => sum + ch.wordCount, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Not Yet
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {isPublishing ? "Publishing..." : "Publish Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
