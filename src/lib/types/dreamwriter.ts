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

export interface StoryOutline {
  title: string;
  cp: string[];
  setting: string;
  tone: string;
  wordTarget: number;
  scenes: SceneOutline[];
  emotionalArc: string;
}

export interface SceneOutline {
  summary: string;
  characters: string[];
  emotion: string;
}

export interface QualityReport {
  overallScore: number;
  oocIssues: OOCIssue[];
  consistencyIssues: string[];
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
  cp: string[];
  tags: string[];
  setting: string;
  wordCount: number;
  qualityScore: number;
  language: "zh" | "en";
  suggestions: string[];
}

export interface CreationProgressEvent {
  stage: DreamWriterStage;
  message?: string;
  outline?: StoryOutline;
  result?: StoryResult;
  error?: string;
}
