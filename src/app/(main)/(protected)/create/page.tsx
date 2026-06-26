"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, X } from "lucide-react";
import { useStoryCreation } from "@/lib/hooks/useStoryCreation";
import { DreamInput, type CreateSubmit } from "@/components/create/DreamInput";
import { CreationProgress } from "@/components/create/CreationProgress";
import { StoryResult } from "@/components/create/StoryResult";
import { OutOfCreditsDialog } from "@/components/billing/OutOfCreditsDialog";
import { checkCanGenerate } from "@/lib/actions/credits";
import { createRemixSeed, type RemixSeed } from "@/lib/actions/remix";
import { LENGTH_OPTIONS } from "@/lib/billing/pricing";

export default function CreatePage() {
  // useSearchParams requires a Suspense boundary for static prerender.
  return (
    <Suspense fallback={null}>
      <CreatePageContent />
    </Suspense>
  );
}

function CreatePageContent() {
  const searchParams = useSearchParams();
  const remixFrom = searchParams.get("remixFrom");

  const { stage, message, result, storyId, isCreating, saveStatus, create, retrySave, reset } =
    useStoryCreation();
  const [gateOpen, setGateOpen] = useState(false);
  const [gateReason, setGateReason] = useState<string | undefined>();
  const [remixSeed, setRemixSeed] = useState<RemixSeed | null>(null);

  // Load the remix seed (prefill prompt + source attribution) when arriving via
  // /create?remixFrom=<id>. Generation is unchanged — only the edge is recorded.
  useEffect(() => {
    if (!remixFrom) return;
    let cancelled = false;
    createRemixSeed(remixFrom)
      .then((seed) => {
        if (!cancelled) setRemixSeed(seed);
      })
      .catch(() => {
        if (!cancelled) setRemixSeed(null);
      });
    return () => {
      cancelled = true;
    };
  }, [remixFrom]);

  // Pre-generation credit gate. Checks before kicking off the (slow, costly)
  // generation so the user sees a friendly top-up prompt instead of an error.
  // The /api/create route re-checks server-side as the authoritative guard.
  async function handleCreate({ prompt, length, structured }: CreateSubmit) {
    try {
      const gate = await checkCanGenerate(length);
      if (!gate.canGenerate) {
        const label = LENGTH_OPTIONS.find((o) => o.value === length)?.labelZh ?? "本篇";
        setGateReason(
          `${label}需要 ${gate.cost} 积分，当前余额 ${gate.currentBalance} 积分。充值后即可继续。`
        );
        setGateOpen(true);
        return;
      }
    } catch {
      // If the gate check itself fails, fall through and let the server route
      // be the authority (it will reject if truly unauthorized/out of credits).
    }
    create(prompt, length, remixSeed?.sourceId, structured);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      {stage === "idle" && (
        <div className="text-center space-y-6 animate-fade-slide-in">
          <h1 className="font-display text-3xl text-foreground">
            你想看什么样的星穹铁道故事？
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            用你自己的话描述，剩下的交给我。
          </p>
          {remixSeed && (
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-ai-surface px-4 py-2.5 text-left">
              <span className="flex items-center gap-2 text-sm text-foreground">
                <Copy className="size-4 text-accent shrink-0" />
                二创自《{remixSeed.sourceTitle}》 · {remixSeed.sourceAuthor}
              </span>
              <a href="/create" aria-label="取消二创" className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </a>
            </div>
          )}
          <DreamInput
            key={remixSeed?.sourceId ?? "blank"}
            onSubmit={handleCreate}
            initialPrompt={remixSeed?.prompt}
          />
        </div>
      )}

      {isCreating && (
        <div className="text-center space-y-8 animate-fade-slide-in">
          <h2 className="font-display text-2xl text-foreground">正在为你创作...</h2>
          <CreationProgress stage={stage} message={message} />
        </div>
      )}

      {stage === "complete" && result && (
        <div className="animate-fade-slide-in">
          <StoryResult
            result={result}
            storyId={storyId}
            saveStatus={saveStatus}
            onRetrySave={retrySave}
            onCreateAnother={reset}
            onSuggestionClick={(s) => {
              reset();
              // Small delay to let reset take effect
              setTimeout(() => create(s), 100);
            }}
          />
        </div>
      )}

      {stage === "error" && (
        <div className="text-center space-y-4">
          <p className="text-destructive">{message || "创建失败，请重试"}</p>
          <DreamInput onSubmit={handleCreate} initialPrompt={remixSeed?.prompt} />
        </div>
      )}

      <OutOfCreditsDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        isAuthenticated
        reason={gateReason}
      />
    </div>
  );
}
