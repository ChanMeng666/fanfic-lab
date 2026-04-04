/**
 * FanFic Lab Agent State Types
 * Shared between frontend (React) and backend (LangGraph.js agent)
 */

// ============================================
// Pipeline Types (Quick Generate Flow)
// ============================================

export type PipelineStage =
  | "idle"
  | "intake"
  | "research"
  | "planning"
  | "hitl_wait"
  | "writing"
  | "polishing"
  | "delivery"
  | "complete"
  | "error";

export interface StoryRequest {
  fandom: string;
  cp: string[];
  theme: string;
  setting: string;
  constraints: {
    length: "short" | "medium" | "long"; // ~1000 / ~3000 / ~6000 words
    rating: string;
    ending: "happy" | "sad" | "open";
    pov: "first" | "third";
    language: "en" | "zh";
  };
}

export interface WritingPlan {
  title: string;
  elements: string; // CP / Theme / Timeline / Rating summary
  emotionalArc: string[]; // 2-4 beats
  sceneOutline: string[]; // 3-5 scene beats
  constraints: string[]; // Setting rules to follow
}

export interface StoryDeliverable {
  title: string;
  elements: string;
  writingPlan: string;
  body: string;
  continuationHooks: string[];
  metadata: {
    wordCount: number;
    rating: string;
    generationTimeMs: number;
  };
}

// SSE event sent from /api/generate to frontend
export interface PipelineEvent {
  stage: PipelineStage;
  data?: {
    researchData?: SourceResearchData;
    plan?: WritingPlan;
    deliverable?: StoryDeliverable;
    progress?: string; // Human-readable progress message
    error?: string;
    threadId?: string; // For resuming after HITL
  };
}

// ============================================
// Research Data Types
// ============================================

export interface ResearchCharacter {
  name: string;
  description: string;
  traits: string[];
  relationships?: string[];
}

export interface SourceResearchData {
  originalPlot: string;
  mainCharacters: ResearchCharacter[];
  worldSettings: string;
  popularShips: string[];
  canonRelationships: string[];
  searchSources: string[];
}

// ============================================
// Agent State Types
// ============================================

export interface AgentLog {
  message: string;
  done: boolean;
}

export interface ResearchSource {
  title: string;
  content: string;
  url: string;
  score?: number;
}

// Main agent state - used by LangGraph pipeline
export interface FanficAgentState {
  // Pipeline state (Quick Generate)
  pipelineStage: PipelineStage;
  storyRequest: StoryRequest | null;
  writingPlan: WritingPlan | null;
  storyDraft: string;
  deliverable: StoryDeliverable | null;

  // Shared state
  logs: AgentLog[];
  sources: Record<string, ResearchSource>;
}

export const INITIAL_AGENT_STATE: FanficAgentState = {
  pipelineStage: "idle",
  storyRequest: null,
  writingPlan: null,
  storyDraft: "",
  deliverable: null,
  logs: [],
  sources: {},
};

