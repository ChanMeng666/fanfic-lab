"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StoryCardSkeleton() {
  return (
    <Card variant="story" className="overflow-hidden">
      {/* Cover Image Skeleton */}
      <Skeleton className="h-32 w-full rounded-none" />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <Skeleton className="h-6 w-3/4 mb-2" />
            {/* Author */}
            <div className="flex items-center gap-2 mt-1.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {/* Rating badge */}
            <Skeleton className="h-5 w-16" />
            {/* Status badge */}
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Summary */}
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-3" />

        {/* Fandom & Ships */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardFooter>
    </Card>
  );
}
