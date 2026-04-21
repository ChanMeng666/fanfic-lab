"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/lib/actions/user";

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing: boolean;
  canFollow: boolean;
}

export function FollowButton({
  targetUserId,
  initialFollowing,
  canFollow,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!canFollow) {
      toast.error("请先登录后再关注");
      return;
    }
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    startTransition(async () => {
      try {
        const res = await toggleFollow(targetUserId);
        setFollowing(res.following);
      } catch (err) {
        setFollowing(wasFollowing);
        if (err instanceof Error && err.message.includes("Unauthorized")) {
          toast.error("请先登录后再关注");
        } else {
          toast.error(err instanceof Error ? err.message : "操作失败");
        }
      }
    });
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      className="gap-1.5"
      onClick={handleClick}
      disabled={pending}
    >
      {following ? (
        <>
          <UserCheck className="size-3.5" />
          已关注
        </>
      ) : (
        <>
          <UserPlus className="size-3.5" />
          关注
        </>
      )}
    </Button>
  );
}
