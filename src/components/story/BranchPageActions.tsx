"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Check } from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { Button } from "@/components/ui/button";
import { toggleBranchLike, canonizeBranch } from "@/lib/actions/branch";

interface BranchPageActionsProps {
  branchId: string;
  initialLikeCount: number;
  initialLiked: boolean;
  isLoggedIn: boolean;
  isOwner: boolean;
  isCanonized: boolean;
}

export function BranchPageActions({
  branchId,
  initialLikeCount,
  initialLiked,
  isLoggedIn,
  isOwner,
  isCanonized,
}: BranchPageActionsProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);

  async function handleLike() {
    if (busy) return;
    setBusy(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const res = await toggleBranchLike(branchId);
      setLiked(res.liked);
      setLikeCount(res.count);
    } catch (err) {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      toast.error(formatError(err, "操作失败"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCanonize() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await canonizeBranch(branchId);
      toast.success(`已采纳为第 ${res.chapterNumber} 章`);
      router.refresh();
    } catch (err) {
      toast.error(formatError(err, "采纳失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={liked ? "default" : "outline"}
        size="sm"
        className="gap-1.5"
        onClick={handleLike}
        disabled={!isLoggedIn || busy}
        aria-label={liked ? "取消点赞" : "点赞"}
      >
        <Heart className={`size-3.5 ${liked ? "fill-current" : ""}`} />
        {likeCount}
      </Button>
      {isOwner && !isCanonized && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-accent/40 text-accent"
          onClick={handleCanonize}
          disabled={busy}
        >
          <Check className="size-3.5" />
          采纳为正章
        </Button>
      )}
    </div>
  );
}
