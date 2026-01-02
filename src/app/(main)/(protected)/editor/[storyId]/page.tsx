"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Feather,
  Save,
  Upload,
  ChevronDown,
  Clock,
  AlertCircle,
  Check,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SmartEditor, CharacterSidebar } from "@/components/editor";
import { SplitPaneEditor } from "@/components/editor/SplitPaneEditor";
import { AIPartnerPanel } from "@/components/editor/AIPartnerPanel";
import { useStory, useAutosave } from "@/lib/hooks";
import { updateStory, updateChapter, publishStory } from "@/lib/actions/story";
import type { StoryContext, StoryCharacter } from "@/lib/types/agent-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  // Calculate word count
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-surface sticky top-0 z-50">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </header>
        <div className="flex h-[calc(100vh-56px)]">
          <div className="flex-1 p-6">
            <Skeleton className="h-[600px] w-full max-w-3xl mx-auto rounded-xl" />
          </div>
          <div className="w-[400px] border-l border-border p-4">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !story || !storyContext) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-destructive/10 text-destructive mx-auto mb-4">
            <AlertCircle className="size-8" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            Story Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error ||
              "The story you're looking for doesn't exist or you don't have access."}
          </p>
          <Link href="/profile">
            <Button>Go to My Stories</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentChapter = story.chapters.find((c) => c.id === currentChapterId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left side: Logo, Back, Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 mr-2">
              <div className="flex items-center justify-center size-8 rounded-xl bg-primary text-primary-foreground">
                <Feather className="size-4" />
              </div>
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">My Stories</span>
            </Link>

            <span className="text-border">|</span>

            <Input
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              onBlur={handleTitleSave}
              placeholder="Untitled Story"
              className="border-none bg-transparent font-medium text-foreground w-64 focus-visible:ring-0 px-2"
              disabled={isSavingTitle}
            />
          </div>

          {/* Center: Story metadata & Chapter selector */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="hidden md:flex">
              {storyContext.fandom}
            </Badge>

            {story.chapters.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    Ch. {currentChapter?.chapterNumber || 1}
                    {currentChapter?.title && (
                      <span className="text-muted-foreground max-w-[100px] truncate">
                        : {currentChapter.title}
                      </span>
                    )}
                    <ChevronDown className="size-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {story.chapters.map((chapter) => (
                    <DropdownMenuItem
                      key={chapter.id}
                      onClick={() => handleChapterChange(chapter.id)}
                      className={cn(
                        currentChapterId === chapter.id && "bg-secondary"
                      )}
                    >
                      <span className="font-medium">Ch. {chapter.chapterNumber}</span>
                      {chapter.title && (
                        <span className="text-muted-foreground ml-2 truncate max-w-[150px]">
                          {chapter.title}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Right side: Save status, Actions */}
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <div className="animate-spin size-3 border-2 border-primary border-t-transparent rounded-full" />
                  Saving...
                </span>
              ) : hasUnsavedChanges ? (
                <span className="flex items-center gap-1 text-warning">
                  <AlertCircle className="size-3" />
                  Unsaved
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1.5 text-success">
                  <Check className="size-3" />
                  Saved
                </span>
              ) : null}
            </div>

            {/* Status badge */}
            <Badge
              variant={story.status === "PUBLISHED" ? "default" : "secondary"}
              className="hidden sm:flex"
            >
              {story.status === "PUBLISHED" ? "Published" : "Draft"}
            </Badge>

            {/* Action buttons */}
            <Button
              size="sm"
              variant="outline"
              onClick={saveNow}
              disabled={isSaving || !hasUnsavedChanges}
              className="gap-1.5"
            >
              <Save className="size-4" />
              <span className="hidden sm:inline">Save</span>
            </Button>

            {story.status === "DRAFT" && (
              <Button
                size="sm"
                onClick={() => setShowPublishDialog(true)}
                className="gap-1.5"
              >
                <Upload className="size-4" />
                <span className="hidden sm:inline">Publish</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Split Pane */}
      <div className="flex-1 overflow-hidden">
        <SplitPaneEditor
          leftPane={
            <div className="h-full flex flex-col">
              {/* Character Sidebar Toggle (optional, could be a floating panel) */}
              <div className="flex-1 overflow-auto">
                <div className="max-w-3xl mx-auto py-8 px-6">
                  <SmartEditor
                    storyContext={storyContext}
                    initialContent={content}
                    onContentChange={handleContentChange}
                  />
                </div>
              </div>

              {/* Bottom status bar */}
              <div className="flex items-center justify-between px-6 py-2 border-t border-border bg-surface/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>
                    {content.length.toLocaleString()} characters
                  </span>
                </div>
                {lastSaved && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3" />
                    <span>Last saved {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          }
          rightPane={
            <AIPartnerPanel
              storyContext={{
                fandom: storyContext.fandom,
                ships: storyContext.ships,
                tone: storyContext.tone,
                characters: storyContext.characters,
              }}
              wordCount={wordCount}
            />
          }
          defaultLeftWidth={60}
          minLeftWidth={45}
          maxLeftWidth={75}
        />
      </div>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Publish Story</DialogTitle>
            <DialogDescription>
              Are you ready to share your story with the world? Once published,
              your story will be visible in the Fandom Feed.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium text-foreground">{storyTitle}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Fandom</span>
                <span className="font-medium text-foreground">
                  {storyContext.fandom}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Chapters</span>
                <span className="font-medium text-foreground">
                  {story.chapters.length}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Total Words</span>
                <span className="font-medium text-foreground">
                  {story.chapters
                    .reduce((sum, ch) => sum + ch.wordCount, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              Not Yet
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
