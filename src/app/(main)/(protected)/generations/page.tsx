"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, FileText, BookOpen, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getGenerationHistory } from "@/lib/actions/generation";
import type { StoryRequest, StoryDeliverable } from "@/lib/types/agent-state";

interface GenerationRecord {
  id: string;
  type: string;
  status: string;
  request: StoryRequest;
  deliverable: StoryDeliverable | null;
  wordCount: number;
  creditsCharged: number;
  createdAt: Date;
  completedAt: Date | null;
}

export default function GenerationsPage() {
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getGenerationHistory(page)
      .then((data) => {
        setGenerations(data.generations);
        setTotal(data.total);
        setHasMore(data.hasMore);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
              <BookOpen className="size-4" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Generation History
            </h1>
            <Badge variant="secondary" className="text-xs">
              {total}
            </Badge>
          </div>
          <Link href="/generate">
            <Button className="gap-1.5">
              <Sparkles className="size-4" />
              New Story
            </Button>
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin size-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && generations.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <Sparkles className="size-8 text-accent mx-auto" />
              <h3 className="font-display text-lg font-semibold">No generations yet</h3>
              <p className="text-sm text-muted-foreground">
                Generate your first AI-powered fanfic story.
              </p>
              <Link href="/generate">
                <Button className="gap-1.5 mt-2">
                  <Sparkles className="size-4" />
                  Generate a Story
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Generation List */}
        {!isLoading && generations.length > 0 && (
          <div className="space-y-3">
            {generations.map((gen) => (
              <Card key={gen.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">
                          {gen.deliverable?.title || gen.request.fandom}
                        </h3>
                        <Badge
                          variant={gen.status === "COMPLETE" ? "secondary" : "outline"}
                          className="text-xs flex-shrink-0"
                        >
                          {gen.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {gen.request.cp.join(" x ")} &middot; {gen.request.theme}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="size-3" />
                          {gen.wordCount.toLocaleString()} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(gen.createdAt).toLocaleDateString()}
                        </span>
                        {gen.creditsCharged > 0 && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="size-3" />
                            {gen.creditsCharged} credits
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {(page > 1 || hasMore) && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
