/**
 * FanFic Lab Agent State Types
 * Shared between frontend (React) and backend (LangGraph.js agent)
 */

// Character type for story context
export interface StoryCharacter {
  id: string;
  name: string;
  fandom: string;
  personality: string[];
  speechPattern?: string;
  portraitUrl?: string;
  isOriginal?: boolean;
}

// Story context for AI continuity
export interface StoryContext {
  id?: string;
  title?: string;
  fandom: string;
  ships: string[];
  tags: string[];
  plotPoints: string[];
  currentChapter: number;
  characters: StoryCharacter[];
  tone: string; // "fluff", "angst", "humor", "dark", etc.
  setting?: string;
}

// Wizard session state for Creative Wizard
export interface WizardSession {
  step: "fandom" | "ship" | "characters" | "plot" | "complete";
  fandom?: string;
  ship?: string;
  characters: StoryCharacter[];
  plotIdeas: string[];
  userPreferences: {
    tone?: string;
    length?: "short" | "medium" | "long";
    rating?: string;
  };
}

// Pending content awaiting approval
export interface PendingContent {
  type: "outline" | "continuation" | "expansion" | "image";
  content: string;
  approved?: boolean;
}

// OOC check result for a character
export interface OOCCheckResult {
  characterId: string;
  characterName: string;
  issues: string[];
  suggestions: string[];
}

// Generated image
export interface GeneratedImage {
  id: string;
  type: "character_portrait" | "scene_illustration" | "cover";
  url: string;
  prompt: string;
}

// Main agent state - shared with frontend via useCoAgent
export interface FanficAgentState {
  // Story context
  storyContext: StoryContext | null;

  // Current editor content
  editorContent: string;

  // Wizard session
  wizardSession: WizardSession | null;

  // Generated content awaiting approval
  pendingContent: PendingContent | null;

  // OOC check results
  oocCheckResults: OOCCheckResult[];

  // Generated images
  generatedImages: GeneratedImage[];
}

// Initial state for useCoAgent
export const INITIAL_AGENT_STATE: FanficAgentState = {
  storyContext: null,
  editorContent: "",
  wizardSession: null,
  pendingContent: null,
  oocCheckResults: [],
  generatedImages: [],
};
