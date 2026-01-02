import { Skeleton } from "@/components/ui/skeleton";

export default function EditorLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-10 w-64 mx-auto rounded-xl" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-48 mx-auto rounded-xl" />
        </div>
      </main>
    </div>
  );
}
