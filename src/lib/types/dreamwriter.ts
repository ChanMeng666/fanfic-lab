export type DreamWriterStage =
  | "idle"
  | "parsing"
  | "planning"
  | "writing"
  | "checking"
  | "revising"
  | "complete"
  | "error";

export interface StoryCreationRequest {
  prompt: string;
  language: "zh" | "en";
  showOutline?: boolean;
}

/**
 * Structured creation input from the form. When `cp` is present the intent
 * parser uses these directly (no LLM parse), which is more reliable than
 * inferring everything from free text. `freeText` is the optional 灵感补充.
 */
export interface InputIntent {
  cp?: string[];
  setting?: string;
  tone?: string;
  pov?: string;
  ending?: string;
  rating?: string;
  avoid?: string[];
  mustInclude?: string;
  freeText?: string;
}

export interface StoryOutline {
  title: string;
  cp: string[];
  setting: string;
  tone: string;
  wordTarget: number;
  scenes: SceneOutline[];
  emotionalArc: string;
  // Craft-layer fields (Phase 1). Optional so fallback outlines stay simple.
  pov?: string;
  themeLine?: string;
  beatTemplate?: string;
}

export interface SceneOutline {
  summary: string;
  characters: string[];
  emotion: string;
  // Craft-layer fields (Phase 1). Optional for backward-compatible fallbacks.
  hook?: string;
  turn?: string;
  beatType?: string;
  sensoryAnchor?: string;
}

export interface QualityDimensions {
  characterFidelity: number;
  pacing: number;
  proseTexture: number;
  emotionalPayoff: number;
  dialogue: number;
  immersion: number;
}

export interface FlaggedScene {
  sceneIndex: number;
  problem: string;
  fix: string;
}

export interface QualityReport {
  overallScore: number;
  dimensions: QualityDimensions;
  oocIssues: OOCIssue[];
  aiFlavorFlags: string[];
  flaggedScenes: FlaggedScene[];
  proseNotes: string[];
  passesThreshold: boolean;
}

export interface OOCIssue {
  character: string;
  issue: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
}

export interface StoryResult {
  title: string;
  body: string;
  summary: string;
  cp: string[];
  tags: string[];
  setting: string;
  wordCount: number;
  qualityScore: number;
  language: "zh" | "en";
  suggestions: string[];
  // Content rating from intent (G/T/M); mapped to the Prisma enum on save.
  rating?: string;
}

export interface CreationProgressEvent {
  stage: DreamWriterStage;
  message?: string;
  outline?: StoryOutline;
  result?: StoryResult;
  // Server-issued id of the persisted Generation row. Sent alongside the final
  // `result` event; the client passes it (NOT the story content) to /api/stories
  // so the save is billed from the server's authoritative record, not client input.
  generationId?: string;
  error?: string;
}
