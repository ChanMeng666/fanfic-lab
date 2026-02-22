"use client";

import { useState, useCallback } from "react";
import type {
  EditorAIRequest,
  EditorAIResponse,
  StoryContext,
} from "@/lib/types/agent-state";

interface UseEditorAIOptions {
  storyContext: StoryContext;
}

interface UseEditorAIReturn {
  isLoading: boolean;
  error: string | null;
  requestContinuation: (content: string) => Promise<string | null>;
  requestExpansion: (
    content: string,
    selectedText: string,
    focusArea: string
  ) => Promise<string | null>;
  requestPolish: (
    content: string,
    selectedText: string,
    intensity: string
  ) => Promise<string | null>;
  requestOOCCheck: (content: string) => Promise<string | null>;
}

async function callEditorAPI(
  request: EditorAIRequest
): Promise<EditorAIResponse> {
  const response = await fetch("/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string }).error ||
        `Request failed: ${response.status}`
    );
  }

  return response.json();
}

export function useEditorAI({
  storyContext,
}: UseEditorAIOptions): UseEditorAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestContinuation = useCallback(
    async (content: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await callEditorAPI({
          action: "continue",
          content,
          storyContext,
        });
        return res.result;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Continuation failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [storyContext]
  );

  const requestExpansion = useCallback(
    async (
      content: string,
      selectedText: string,
      focusArea: string
    ): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await callEditorAPI({
          action: "expand",
          content,
          selectedText,
          storyContext,
          options: {
            focusArea: focusArea as NonNullable<EditorAIRequest["options"]>["focusArea"],
          },
        });
        return res.result;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Expansion failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [storyContext]
  );

  const requestPolish = useCallback(
    async (
      content: string,
      selectedText: string,
      intensity: string
    ): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await callEditorAPI({
          action: "polish",
          content,
          selectedText,
          storyContext,
          options: {
            intensity: intensity as NonNullable<EditorAIRequest["options"]>["intensity"],
          },
        });
        return res.result;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Polish failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [storyContext]
  );

  const requestOOCCheck = useCallback(
    async (content: string): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await callEditorAPI({
          action: "ooc_check",
          content,
          storyContext,
        });
        return res.result;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "OOC check failed";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [storyContext]
  );

  return {
    isLoading,
    error,
    requestContinuation,
    requestExpansion,
    requestPolish,
    requestOOCCheck,
  };
}
