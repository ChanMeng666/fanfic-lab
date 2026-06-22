"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Vote,
  Plus,
  X,
  Loader2,
  Sparkles,
  Trash2,
  Check,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  createPoll,
  votePoll,
  addPollOption,
  deletePoll,
  type PollView,
} from "@/lib/actions/poll";

interface ChapterMeta {
  id: string;
  chapterNumber: number;
  title: string | null;
}

interface BranchPollsProps {
  storyId: string;
  chapters: ChapterMeta[];
  polls: PollView[];
  currentUserId: string | null;
  isOwner: boolean;
  isLoggedIn: boolean;
  allowBranching: boolean;
}

const STATUS_LABEL: Record<PollView["status"], { text: string; cls: string }> = {
  OPEN: { text: "投票中", cls: "bg-primary/15 text-primary border-primary/30" },
  CLOSED: { text: "已结束", cls: "bg-muted text-muted-foreground" },
  GENERATED: { text: "已生成", cls: "bg-success/15 text-success border-success/30" },
};

export function BranchPolls({
  storyId,
  chapters,
  polls: initialPolls,
  currentUserId,
  isOwner,
  isLoggedIn,
  allowBranching,
}: BranchPollsProps) {
  const router = useRouter();
  const [polls, setPolls] = useState(initialPolls);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settleMsg, setSettleMsg] = useState("");
  const [newOptionDraft, setNewOptionDraft] = useState<Record<string, string>>({});

  const lastChapter = chapters[chapters.length - 1];

  async function handleVote(pollId: string, optionId: string) {
    if (!isLoggedIn) {
      toast.error("请先登录后再投票");
      return;
    }
    const poll = polls.find((p) => p.id === pollId);
    if (!poll || poll.status !== "OPEN" || poll.myVoteOptionId === optionId) return;

    const prev = poll.myVoteOptionId;
    // optimistic
    setPolls((cur) =>
      cur.map((p) => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          myVoteOptionId: optionId,
          totalVotes: p.totalVotes + (prev ? 0 : 1),
          options: p.options.map((o) => {
            if (o.id === optionId) return { ...o, voteCount: o.voteCount + 1 };
            if (o.id === prev) return { ...o, voteCount: Math.max(0, o.voteCount - 1) };
            return o;
          }),
        };
      })
    );
    try {
      await votePoll({ pollId, optionId });
    } catch (err) {
      router.refresh();
      toast.error(formatError(err, "投票失败"));
    }
  }

  async function handleCreate() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (q.length < 5) {
      toast.error("请把问题写清楚（至少 5 字）");
      return;
    }
    if (opts.length < 2) {
      toast.error("至少需要 2 个方向选项");
      return;
    }
    if (!lastChapter) return;
    setSubmitting(true);
    try {
      await createPoll({
        storyId,
        parentChapterId: lastChapter.id,
        question: q,
        options: opts,
      });
      toast.success("接龙投票已发起");
      setCreating(false);
      setQuestion("");
      setOptions(["", ""]);
      router.refresh();
    } catch (err) {
      toast.error(formatError(err, "发起失败"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddOption(pollId: string) {
    const label = (newOptionDraft[pollId] ?? "").trim();
    if (label.length < 3) {
      toast.error("方向描述至少 3 字");
      return;
    }
    try {
      await addPollOption({ pollId, label });
      setNewOptionDraft((d) => ({ ...d, [pollId]: "" }));
      toast.success("已添加方向");
      router.refresh();
    } catch (err) {
      toast.error(formatError(err, "添加失败"));
    }
  }

  async function handleDelete(pollId: string) {
    try {
      await deletePoll(pollId);
      setPolls((cur) => cur.filter((p) => p.id !== pollId));
      toast.success("已删除投票");
    } catch (err) {
      toast.error(formatError(err, "删除失败"));
    }
  }

  async function handleSettle(pollId: string) {
    setSettlingId(pollId);
    setSettleMsg("正在结算…");
    try {
      const res = await fetch(`/api/stories/${storyId}/polls/${pollId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
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
            if (event.message) setSettleMsg(event.message);
            if (event.stage === "complete") {
              toast.success(event.message || "已生成分支");
              router.refresh();
              return;
            }
            if (event.stage === "error") lastError = event.error || "结算失败";
          } catch {
            // skip
          }
        }
      }
      if (lastError) throw new Error(lastError);
    } catch (err) {
      toast.error(formatError(err, "结算失败"));
    } finally {
      setSettlingId(null);
      setSettleMsg("");
    }
  }

  // Nothing to show and can't create → render nothing.
  if (polls.length === 0 && !(isLoggedIn && allowBranching)) return null;

  return (
    <section
      id="polls"
      className="rounded-2xl border border-primary/25 bg-surface p-4 sm:p-6 scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2.5 font-display text-lg sm:text-xl text-foreground">
          <span className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
            <Vote className="size-4" />
          </span>
          接龙投票
          {polls.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {polls.length}
            </Badge>
          )}
        </h2>
        {isLoggedIn && allowBranching && lastChapter && !creating && (
          <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" />
            发起投票
          </Button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-5 rounded-xl border border-border bg-background p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            从第 {lastChapter?.chapterNumber} 章之后接龙：让大家投票决定下一步走向，胜出方向由作者结算生成。
          </p>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="接下来该怎么发展？"
            rows={2}
            className="resize-none"
            aria-label="投票问题"
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) =>
                    setOptions((cur) => cur.map((o, idx) => (idx === i ? e.target.value : o)))
                  }
                  placeholder={`方向 ${i + 1}`}
                  aria-label={`方向 ${i + 1}`}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground"
                    onClick={() => setOptions((cur) => cur.filter((_, idx) => idx !== i))}
                    aria-label="移除选项"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => setOptions((cur) => [...cur, ""])}
              >
                <Plus className="size-3.5" />
                添加方向
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCreate} disabled={submitting} className="gap-1.5">
              <Vote className="size-3.5" />
              {submitting ? "发起中…" : "发起投票"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)} disabled={submitting}>
              取消
            </Button>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          还没有接龙投票。发起一个，让大家一起决定故事走向。
        </p>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => {
            const status = STATUS_LABEL[poll.status];
            const canManage = isOwner || poll.creator.id === currentUserId;
            const settling = settlingId === poll.id;
            return (
              <div key={poll.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{poll.question}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Avatar className="size-5">
                        <AvatarImage src={poll.creator.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-secondary">
                          {poll.creator.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{poll.creator.displayName || poll.creator.username}</span>
                      <span>· {poll.totalVotes} 票</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${status.cls}`}>
                    {status.text}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {poll.options.map((o) => {
                    const pct =
                      poll.totalVotes > 0 ? Math.round((o.voteCount / poll.totalVotes) * 100) : 0;
                    const mine = poll.myVoteOptionId === o.id;
                    const votable = poll.status === "OPEN";
                    return (
                      <button
                        key={o.id}
                        type="button"
                        disabled={!votable}
                        onClick={() => handleVote(poll.id, o.id)}
                        className={`relative w-full text-left rounded-lg border px-3 py-2 overflow-hidden transition-colors ${
                          mine ? "border-primary" : "border-border"
                        } ${votable ? "hover:border-primary/60 cursor-pointer" : "cursor-default"}`}
                      >
                        <span
                          className="absolute inset-y-0 left-0 bg-primary/10"
                          style={{ width: `${pct}%` }}
                          aria-hidden
                        />
                        <span className="relative flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-sm text-foreground min-w-0">
                            {mine && <Check className="size-3.5 text-primary shrink-0" />}
                            <span className="truncate">{o.label}</span>
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                            {o.voteCount} · {pct}%
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Propose a new direction */}
                {poll.status === "OPEN" && isLoggedIn && (
                  <div className="flex gap-2">
                    <Input
                      value={newOptionDraft[poll.id] ?? ""}
                      onChange={(e) =>
                        setNewOptionDraft((d) => ({ ...d, [poll.id]: e.target.value }))
                      }
                      placeholder="提议新方向…"
                      className="h-8 text-sm"
                      aria-label="提议新方向"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={() => handleAddOption(poll.id)}
                    >
                      <Plus className="size-3.5" />
                      添加
                    </Button>
                  </div>
                )}

                {/* Result link / actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div>
                    {poll.status === "GENERATED" && poll.resultBranchId && (
                      <Link href={`/story/${storyId}/branch/${poll.resultBranchId}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-7">
                          <GitBranch className="size-3.5" />
                          查看生成的分支
                        </Button>
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isOwner && poll.status === "OPEN" && (
                      <Button
                        size="sm"
                        className="gap-1.5 h-7"
                        onClick={() => handleSettle(poll.id)}
                        disabled={settling}
                      >
                        {settling ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        {settling ? settleMsg || "结算中…" : "结算并生成"}
                      </Button>
                    )}
                    {canManage && poll.status !== "GENERATED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(poll.id)}
                        aria-label="删除投票"
                        disabled={settling}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
