"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import type {
  DreamWriterStage,
  StoryOutline,
  StoryResult,
  CreationProgressEvent,
} from "@/lib/types/dreamwriter";
import type { StoryLength } from "@/lib/billing/pricing";
import type { StructuredCreateInput } from "@/lib/create-options";

// Tracks the lifecycle of the post-generation persistence call to /api/stories.
// "failed" is surfaced to the user with a retry affordance so a generated story
// is never silently lost when the save request errors.
export type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface UseStoryCreationReturn {
  stage: DreamWriterStage;
  message: string | null;
  outline: StoryOutline | null;
  result: StoryResult | null;
  storyId: string | null;
  error: string | null;
  isCreating: boolean;
  saveStatus: SaveStatus;
  create: (
    prompt: string,
    length?: StoryLength,
    remixedFromId?: string,
    structured?: StructuredCreateInput,
  ) => Promise<void>;
  retrySave: () => void;
  reset: () => void;
}

export function useStoryCreation(): UseStoryCreationReturn {
  const [stage, setStage] = useState<DreamWriterStage>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  // The payload last handed to /api/stories, kept so retrySave() can re-POST
  // the exact same story if the first attempt fails.
  const savePayloadRef = useRef<{
    result: StoryResult;
    prompt: string;
    length: StoryLength;
    remixedFromId?: string;
  } | null>(null);

  const isCreating = stage !== "idle" && stage !== "complete" && stage !== "error";

  // Persists the generated story. Idempotent on success: once a storyId is set
  // (story saved) further calls are no-ops so a retry can't create duplicates.
  const persistStory = useCallback(
    async (payload: {
      result: StoryResult;
      prompt: string;
      length: StoryLength;
      remixedFromId?: string;
    }) => {
      savePayloadRef.current = payload;
      setSaveStatus("saving");
      try {
        const r = await fetch("/api/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          // Survive a tab close / navigation right after generation completes.
          keepalive: true,
        });
        if (!r.ok) {
          throw new Error(`save failed: ${r.status}`);
        }
        const data = await r.json();
        if (data.storyId) setStoryId(data.storyId);
        setSaveStatus("saved");
        if (typeof data.creditsCharged === "number") {
          if (data.creditsCharged > 0) {
            toast.success(
              `本次消耗 ${data.creditsCharged} 积分，余额 ${data.newBalance} 积分`
            );
          } else {
            toast.success("本次创作使用了每日免费额度");
          }
        }
      } catch {
        setSaveStatus("failed");
        toast.error("故事保存失败，请点击「重试保存」");
      }
    },
    []
  );

  const retrySave = useCallback(() => {
    if (storyId || saveStatus === "saving") return; // already saved / in flight
    const payload = savePayloadRef.current;
    if (payload) void persistStory(payload);
  }, [storyId, saveStatus, persistStory]);

  const create = useCallback(async (prompt: string, length: StoryLength = "short", remixedFromId?: string, structured?: StructuredCreateInput) => {
    // Reset state
    setStage("parsing");
    setMessage("正在理解你的创作需求...");
    setOutline(null);
    setResult(null);
    setStoryId(null);
    setError(null);
    setSaveStatus("idle");

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, length, ...(structured ?? {}) }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "创建失败" }));
        setStage("error");
        setError(err.error || "创建失败");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const event = JSON.parse(dataStr) as CreationProgressEvent;

            setStage(event.stage);
            if (event.message) setMessage(event.message);
            if (event.outline) setOutline(event.outline);
            if (event.result) {
              setResult(event.result);
              // Auto-save story to database. The save endpoint also applies the
              // credit charge for this generation. On failure we flip saveStatus
              // to "failed" so the UI can offer a manual retry — the story is
              // never silently dropped.
              void persistStory({ result: event.result, prompt, length, remixedFromId });
            }
            if (event.error) setError(event.error);
          } catch {
            // Skip unparseable events
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setStage("error");
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }, [persistStory]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
    setMessage(null);
    setOutline(null);
    setResult(null);
    setStoryId(null);
    setError(null);
    setSaveStatus("idle");
    savePayloadRef.current = null;
  }, []);

  return {
    stage,
    message,
    outline,
    result,
    storyId,
    error,
    isCreating,
    saveStatus,
    create,
    retrySave,
    reset,
  };
}
