import { redirect } from "next/navigation";
import { Feather } from "lucide-react";
import { stackServerApp } from "@/lib/stack";
import { prisma } from "@/lib/db";
import { ShelfGrid } from "@/components/shelf/ShelfGrid";

export default async function ShelfPage() {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  // Look up the database user by their Stack Auth ID
  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: user.id },
    select: { id: true },
  });

  const stories = dbUser
    ? await prisma.story.findMany({
        where: { authorId: dbUser.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          ships: true,
          tags: true,
          wordCount: true,
          createdAt: true,
          fandom: true,
          status: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              chapters: true,
            },
          },
        },
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
            <Feather className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              我的书架
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              共 {stories.length} 篇故事
            </p>
          </div>
        </div>

        <ShelfGrid stories={stories} />
      </main>
    </div>
  );
}
