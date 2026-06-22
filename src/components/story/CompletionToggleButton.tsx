"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setStoryCompletion } from "@/lib/actions/story";
import { formatError } from "@/lib/format-error";

interface CompletionToggleButtonProps {
  storyId: string;
  isComplete: boolean;
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
}

/**
 * Owner control to flip a story between 连载中 and 已完结. Independent of
 * visibility — completed stories stay published and visible in the feed.
 */
export function CompletionToggleButton({
  storyId,
  isComplete,
  size = "sm",
  variant = "outline",
}: CompletionToggleButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [complete, setComplete] = useState(isComplete);

  function handleToggle() {
    const next = !complete;
    startTransition(async () => {
      try {
        await setStoryCompletion(storyId, next);
        setComplete(next);
        toast.success(next ? "已标记为完结" : "已恢复连载");
        router.refresh();
      } catch (err) {
        toast.error(formatError(err, "操作失败"));
      }
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      className="gap-1.5"
      onClick={handleToggle}
      disabled={pending}
    >
      {complete ? (
        <>
          <RotateCcw className="size-3.5" />
          恢复连载
        </>
      ) : (
        <>
          <CheckCircle2 className="size-3.5" />
          标记完结
        </>
      )}
    </Button>
  );
}
