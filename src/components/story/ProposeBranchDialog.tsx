"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GitBranch } from "lucide-react";
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

interface ProposeBranchDialogProps {
  storyId: string;
  parentChapterId: string;
  // Chapter the branch forks off (for copy only).
  parentChapterNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Reader-facing "我来续写" dialog. Mirrors ContinueChapterDialog but posts to
 * the community branch route and forks off a specific chapter. On success the
 * page refreshes so the branch tree (a server component) re-fetches.
 */
export function ProposeBranchDialog({
  storyId,
  parentChapterId,
  parentChapterNumber,
  open,
  onOpenChange,
}: ProposeBranchDialogProps) {
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
      toast.error("请描述续写的方向（至少 5 字）");
      return;
    }

    setWorking(true);
    setProgressMessage("正在准备…");

    try {
      const res = await fetch(`/api/stories/${storyId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentChapterId, direction: dir }),
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
              toast.success(event.message || "续写分支已生成");
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
            <GitBranch className="size-5 text-accent" />
            续写一个分支
          </DialogTitle>
          <DialogDescription>
            从第 {parentChapterNumber} 章之后接着写。AI 会沿用原作风格生成一个「可能的走向」，
            作者可以采纳它为正章（约 30~60 秒）。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <Textarea
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            disabled={working}
            placeholder="例如：如果这一次他没有离开，而是留下来说出真相…"
            rows={5}
            className="resize-none"
            aria-label="续写方向"
          />
          <p className="text-xs text-muted-foreground">
            提示：写明你想看到的关键情节、情绪与角色，越具体越好。
          </p>
          <p className="text-xs text-muted-foreground">
            计费：触发生成者付费，按成品字数约 1 积分 / 千字（一般 2~4 积分），从你的积分余额扣除。
          </p>

          {working && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border border-accent/30 bg-accent/5 rounded-md px-3 py-2">
              <Loader2 className="size-4 animate-spin text-accent" />
              {progressMessage || "处理中…"}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={working || direction.trim().length < 5}
            className="gap-1.5"
          >
            <GitBranch className="size-4" />
            {working ? "续写中…" : "生成分支"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
