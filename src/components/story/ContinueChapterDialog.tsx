"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ContinueChapterDialogProps {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContinueChapterDialog({
  storyId,
  open,
  onOpenChange,
}: ContinueChapterDialogProps) {
  const router = useRouter();
  const [direction, setDirection] = useState("");
  const [working, setWorking] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");

  function reset() {
    setDirection("");
    setWorking(false);
    setProgressMessage("");
  }

  async function handleSubmit() {
    const dir = direction.trim();
    if (dir.length < 5) {
      toast.error("请描述下一章的方向（至少 5 字）");
      return;
    }

    setWorking(true);
    setProgressMessage("正在准备…");

    try {
      const res = await fetch(`/api/stories/${storyId}/continue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: dir }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error || "请求失败");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6).trim());
            if (event.message) setProgressMessage(event.message);
            if (event.stage === "complete") {
              toast.success(event.message || "续写完成");
              reset();
              onOpenChange(false);
              router.refresh();
              return;
            }
            if (event.stage === "error") {
              lastError = event.error || "续写失败";
            }
          } catch {
            // skip unparseable
          }
        }
      }

      if (lastError) throw new Error(lastError);
    } catch (err) {
      toast.error(formatError(err, "续写失败"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (working) return; // don't allow closing during the LLM call
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="size-5 text-accent" />
            续写下一章
          </DialogTitle>
          <DialogDescription>
            描述下一章的方向，AI 会基于已有章节风格继续创作（约 30~60 秒）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Textarea
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            disabled={working}
            placeholder="例如：他们去了海边，但夕阳下两人产生了误会…"
            rows={5}
            className="resize-none"
            aria-label="本章方向"
          />
          <p className="text-xs text-muted-foreground">
            提示：写明关键情节、想要的情绪、需要出现的角色，越具体越好。
          </p>

          {working && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border border-accent/30 bg-accent/5 rounded-md px-3 py-2">
              <Loader2 className="size-4 animate-spin text-accent" />
              {progressMessage || "处理中…"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={working}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={working || direction.trim().length < 5}
            className="gap-1.5"
          >
            <Sparkles className="size-4" />
            {working ? "续写中…" : "开始续写"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
