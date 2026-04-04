import Link from "next/link";
import { BookOpen, Sparkles, Heart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "草稿", className: "bg-muted text-muted-foreground" },
  PUBLISHED: { label: "已发布", className: "bg-primary/10 text-primary" },
  ARCHIVED: { label: "已归档", className: "bg-secondary text-secondary-foreground" },
};

interface ShelfStory {
  id: string;
  title: string;
  ships: string[];
  tags: string[];
  wordCount: number;
  createdAt: Date;
  fandom: string;
  status: string;
  _count: {
    likes: number;
    comments: number;
    chapters: number;
  };
}

interface ShelfGridProps {
  stories: ShelfStory[];
}

export function ShelfGrid({ stories }: ShelfGridProps) {
  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-surface mb-6">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-2xl font-semibold text-foreground mb-3">
          书架还是空的
        </h3>
        <p className="text-muted-foreground mb-8 max-w-sm">
          你还没有创作过故事，描述你的创意，让AI为你执笔吧
        </p>
        <Link href="/create">
          <Button className="gap-1.5">
            <Sparkles className="size-4" />
            开始创作
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {stories.map((story) => (
        <Link key={story.id} href={`/story/${story.id}`} className="group">
          <Card className="h-full transition-shadow hover:shadow-md hover-lift">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                  {story.title}
                </CardTitle>
                <Badge variant="secondary" className={`text-xs shrink-0 ${statusLabels[story.status]?.className ?? ""}`}>
                  {statusLabels[story.status]?.label ?? story.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Ships badges */}
              {story.ships.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {story.ships.slice(0, 3).map((ship) => (
                    <Badge
                      key={ship}
                      className="bg-accent/15 text-accent border-accent/30 text-xs"
                    >
                      {ship}
                    </Badge>
                  ))}
                  {story.ships.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{story.ships.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Footer: stats + date */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3" />
                    {story.wordCount.toLocaleString()} 字
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="size-3" />
                    {story._count.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3" />
                    {story._count.comments}
                  </span>
                </div>
                <span>
                  {new Date(story.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
