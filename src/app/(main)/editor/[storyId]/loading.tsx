import { Skeleton } from "@/components/ui/skeleton";

export default function StoryEditorLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </header>
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left pane - Editor */}
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-[500px] w-full rounded-xl" />
          </div>
        </div>
        {/* Right pane - AI Partner */}
        <div className="w-[400px] border-l border-border bg-surface p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
