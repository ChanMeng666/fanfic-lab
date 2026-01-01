import { Skeleton } from "@/components/ui/skeleton";

export default function StoryEditorLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </header>
      <div className="flex h-[calc(100vh-56px)]">
        <aside className="w-72 border-r bg-white dark:bg-gray-900 p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-24 w-full mb-4" />
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
