"use client";

import { useState, useCallback, useRef } from "react";
import type {
  StoryRequest,
  WritingPlan,
  StoryDeliverable,
  PipelineStage,
  PipelineEvent,
  SourceResearchData,
} from "@/lib/types/agent-state";

interface UseStoryGeneratorReturn {
  // State
  stage: PipelineStage;
  plan: WritingPlan | null;
  researchData: SourceResearchData | null;
  deliverable: StoryDeliverable | null;
  error: string | null;
  threadId: string | null;
  progress: string | null;

  // Actions
  startGeneration: (request: StoryRequest) => Promise<void>;
  approvePlan: () => Promise<void>;
  rejectPlan: () => Promise<void>;
  reset: () => void;
}

export function useStoryGenerator(): UseStoryGeneratorReturn {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [plan, setPlan] = useState<WritingPlan | null>(null);
  const [researchData, setResearchData] =
    useState<SourceResearchData | null>(null);
  const [deliverable, setDeliverable] = useState<StoryDeliverable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const processStream = useCallback(
    async (response: Response) => {
      if (!response.ok || !response.body) {
        setStage("error");
        setError(`Request failed: ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
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
          if (!dataStr) continue;

          try {
            const event = JSON.parse(dataStr) as PipelineEvent;

            setStage(event.stage);

            if (event.data?.threadId) {
              setThreadId(event.data.threadId);
            }
            if (event.data?.researchData) {
              setResearchData(event.data.researchData);
            }
            if (event.data?.plan) {
              setPlan(event.data.plan);
            }
            if (event.data?.deliverable) {
              setDeliverable(event.data.deliverable);
            }
            if (event.data?.progress) {
              setProgress(event.data.progress);
            }
            if (event.data?.error) {
              setError(event.data.error);
            }
          } catch {
            // Skip unparseable events
          }
        }
      }
    },
    []
  );

  const startGeneration = useCallback(
    async (request: StoryRequest) => {
      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Reset state
      setStage("intake");
      setPlan(null);
      setResearchData(null);
      setDeliverable(null);
      setError(null);
      setThreadId(null);
      setProgress(null);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyRequest: request,
            action: "start",
          }),
          signal: controller.signal,
        });

        await processStream(response);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStage("error");
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    },
    [processStream]
  );

  const approvePlan = useCallback(async () => {
    if (!threadId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStage("writing");
    setProgress(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          action: "approve_plan",
        }),
        signal: controller.signal,
      });

      await processStream(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStage("error");
      setError(err instanceof Error ? err.message : "Resume failed");
    }
  }, [threadId, processStream]);

  const rejectPlan = useCallback(async () => {
    if (!threadId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStage("planning");
    setProgress("Regenerating plan...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          action: "reject_plan",
        }),
        signal: controller.signal,
      });

      await processStream(response);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStage("error");
      setError(err instanceof Error ? err.message : "Reject failed");
    }
  }, [threadId, processStream]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage("idle");
    setPlan(null);
    setResearchData(null);
    setDeliverable(null);
    setError(null);
    setThreadId(null);
    setProgress(null);
  }, []);

  return {
    stage,
    plan,
    researchData,
    deliverable,
    error,
    threadId,
    progress,
    startGeneration,
    approvePlan,
    rejectPlan,
    reset,
  };
}
