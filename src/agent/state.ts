/**
 * FanFic Lab LangGraph Agent State
 * Defines the state annotation for the LangGraph.js agent
 */

import { Annotation } from "@langchain/langgraph";
import type {
  StoryContext,
  WizardSession,
  PendingContent,
  OOCCheckResult,
  GeneratedImage,
} from "../lib/types/agent-state";

// Import CopilotKit state annotation for integration
// Note: CopilotKitStateAnnotation provides the 'copilotkit' property
// which includes frontend actions and other CopilotKit-specific state
import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";

/**
 * Log entry for tracking agent progress (used by frontend via useCoAgentStateRender)
 */
export interface AgentLog {
  message: string;
  done: boolean;
}

/**
 * FanFic Agent State Annotation
 * Extends CopilotKitStateAnnotation to include CopilotKit integration
 */
export const FanficAgentStateAnnotation = Annotation.Root({
  // Inherit CopilotKit state (messages, actions, etc.)
  ...CopilotKitStateAnnotation.spec,

  // Story context for AI continuity
  storyContext: Annotation<StoryContext | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Current editor content
  editorContent: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),

  // Wizard session state
  wizardSession: Annotation<WizardSession | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Pending content awaiting approval
  pendingContent: Annotation<PendingContent | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // OOC check results
  oocCheckResults: Annotation<OOCCheckResult[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // Generated images
  generatedImages: Annotation<GeneratedImage[]>({
    reducer: (prev, update) => [...prev, ...update],
    default: () => [],
  }),

  // Agent progress logs (used by useCoAgentStateRender on frontend)
  logs: Annotation<AgentLog[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // Research sources (URLs -> source data)
  sources: Annotation<Record<string, { title: string; content: string; url: string; score?: number }>>({
    reducer: (prev, update) => ({ ...prev, ...update }),
    default: () => ({}),
  }),
});

// Type for the agent state
export type FanficAgentState = typeof FanficAgentStateAnnotation.State;
