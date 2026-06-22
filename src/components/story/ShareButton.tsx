"use client";

import { Share2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShareButtonProps {
  title: string;
}

// Per-story share. Pure client-side (no backend): copy link + X / Reddit share
// intents, plus the native share sheet when the browser supports it.
export function ShareButton({ title }: ShareButtonProps) {
  function currentUrl() {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl());
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败，请手动复制地址栏链接");
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `《${title}》`, url: currentUrl() });
      } catch {
        // user cancelled — ignore
      }
    } else {
      copyLink();
    }
  }

  function shareX() {
    const url = encodeURIComponent(currentUrl());
    const text = encodeURIComponent(`《${title}》`);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function shareReddit() {
    const url = encodeURIComponent(currentUrl());
    const t = encodeURIComponent(title);
    window.open(
      `https://www.reddit.com/submit?url=${url}&title=${t}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" aria-label="分享">
          <Share2 className="size-3.5" />
          分享
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={copyLink} className="gap-2">
          <Link2 className="size-3.5" />
          复制链接
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareX} className="gap-2">
          <Share2 className="size-3.5" />
          分享到 X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareReddit} className="gap-2">
          <Share2 className="size-3.5" />
          分享到 Reddit
        </DropdownMenuItem>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <DropdownMenuItem onClick={nativeShare} className="gap-2">
            <Share2 className="size-3.5" />
            更多…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
