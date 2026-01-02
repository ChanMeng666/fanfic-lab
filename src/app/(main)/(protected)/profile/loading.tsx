import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-24 w-24 rounded-full mb-4" />
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4">
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </CardContent>
            </Card>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
