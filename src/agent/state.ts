/**
 * FanFic Lab LangGraph Agent State
 * Defines the state annotation for the 7-node pipeline
 * No CopilotKit dependency - uses native LangGraph state management
 */

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type {
  StoryContext,
  WizardSession,
  PendingContent,
  OOCCheckResult,
  GeneratedImage,
  PipelineStage,
  StoryRequest,
  WritingPlan,
  StoryDeliverable,
} from "../lib/types/agent-state";

/**
 * Log entry for tracking agent progress
 */
export interface AgentLog {
  message: string;
  done: boolean;
}

/**
 * FanFic Agent State Annotation
 * Extends MessagesAnnotation for native LangGraph message handling
 */
export const FanficAgentStateAnnotation = Annotation.Root({
  // Inherit LangGraph message state
  ...MessagesAnnotation.spec,

  // ============================================
  // Pipeline State (Quick Generate flow)
  // ============================================

  pipelineStage: Annotation<PipelineStage>({
    reducer: (_, update) => update,
    default: () => "idle" as PipelineStage,
  }),

  storyRequest: Annotation<StoryRequest | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  writingPlan: Annotation<WritingPlan | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  storyDraft: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  deliverable: Annotation<StoryDeliverable | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // ============================================
  // Legacy State (Wizard/Editor backward compat)
  // ============================================

  storyContext: Annotation<StoryContext | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  editorContent: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  wizardSession: Annotation<WizardSession | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  pendingContent: Annotation<PendingContent | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  oocCheckResults: Annotation<OOCCheckResult[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  generatedImages: Annotation<GeneratedImage[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),

  // ============================================
  // Shared State
  // ============================================

  logs: Annotation<AgentLog[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  sources: Annotation<Record<string, { title: string; content: string; url: string; score?: number }>>({
    reducer: (prev, update) => ({ ...prev, ...update }),
    default: () => ({}),
  }),
});

export type FanficAgentState = typeof FanficAgentStateAnnotation.State;
