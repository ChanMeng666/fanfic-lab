import { Sparkles } from "lucide-react";
import { getRelatedStories } from "@/lib/actions/story";
import { StoryCard, type StoryCardData } from "@/components/feed";

interface RelatedStoriesProps {
  storyId: string;
}

type Rating = "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT";
type Status = "DRAFT" | "PUBLISHED" | "COMPLETE";

export async function RelatedStories({ storyId }: RelatedStoriesProps) {
  const related = await getRelatedStories(storyId, 4);
  if (related.length === 0) return null;

  const cards: StoryCardData[] = related.map((s) => ({
    id: s.id,
    title: s.title,
    summary: s.summary ?? "",
    fandom: s.fandom,
    ships: s.ships,
    tags: s.tags,
    rating: (["GENERAL", "TEEN", "MATURE", "EXPLICIT"] as const).includes(
      s.rating as never
    )
      ? (s.rating as Rating)
      : "GENERAL",
    status: (["DRAFT", "PUBLISHED", "COMPLETE"] as const).includes(
      s.status as never
    )
      ? (s.status as Status)
      : "PUBLISHED",
    wordCount: s.wordCount,
    chapterCount: s._count.chapters,
    likes: s._count.likes,
    comments: s._count.comments,
    views: s.viewCount,
    coverUrl: s.coverImageUrl ?? undefined,
    author: {
      id: s.author.id,
      username: s.author.username,
      avatarUrl: s.author.avatarUrl ?? undefined,
    },
    updatedAt: (s.publishedAt ?? s.updatedAt).toISOString(),
  }));

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-4" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          相关推荐
        </h2>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <StoryCard key={c.id} story={c} />
        ))}
      </div>
    </section>
  );
}
