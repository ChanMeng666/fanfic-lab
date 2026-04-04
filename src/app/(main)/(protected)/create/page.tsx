"use client";

import { useStoryCreation } from "@/lib/hooks/useStoryCreation";
import { DreamInput } from "@/components/create/DreamInput";
import { CreationProgress } from "@/components/create/CreationProgress";
import { StoryResult } from "@/components/create/StoryResult";

export default function CreatePage() {
  const { stage, message, result, storyId, isCreating, create, reset } =
    useStoryCreation();

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
          <DreamInput onSubmit={create} />
        </div>
      )}

      {isCreating && (
        <div className="text-center space-y-8 animate-fade-slide-in">
          <h2 className="font-display text-2xl text-foreground">正在为你创作...</h2>
          <CreationProgress stage={stage} message={message} />
        </div>
      )}

      {stage === "complete" && result && (
        <div className="animate-ai-reveal">
          <StoryResult
            result={result}
            storyId={storyId}
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
          <DreamInput onSubmit={create} />
        </div>
      )}
    </div>
  );
}
