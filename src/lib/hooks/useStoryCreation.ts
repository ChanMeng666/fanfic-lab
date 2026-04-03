"use client";

import { useState, useCallback, useRef } from "react";
import type {
  DreamWriterStage,
  StoryOutline,
  StoryResult,
  CreationProgressEvent,
} from "@/lib/types/dreamwriter";

interface UseStoryCreationReturn {
  stage: DreamWriterStage;
  message: string | null;
  outline: StoryOutline | null;
  result: StoryResult | null;
  error: string | null;
  isCreating: boolean;
  create: (prompt: string) => Promise<void>;
  reset: () => void;
}

export function useStoryCreation(): UseStoryCreationReturn {
  const [stage, setStage] = useState<DreamWriterStage>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isCreating = stage !== "idle" && stage !== "complete" && stage !== "error";

  const create = useCallback(async (prompt: string) => {
    // Reset state
    setStage("parsing");
    setMessage("正在理解你的创作需求...");
    setOutline(null);
    setResult(null);
    setError(null);

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
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
            if (event.result) setResult(event.result);
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
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
    setMessage(null);
    setOutline(null);
    setResult(null);
    setError(null);
  }, []);

  return { stage, message, outline, result, error, isCreating, create, reset };
}
