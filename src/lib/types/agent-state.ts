/**
 * FanFic Lab Agent State Types
 * Shared between frontend (React) and backend (LangGraph.js agent)
 */

// ============================================
// Source & Configuration Types
// ============================================

export type SourceType =
  | "anime"
  | "manga"
  | "game"
  | "novel"
  | "tv"
  | "movie"
  | "kpop"
  | "other";

export type ShipType = "bl" | "gl" | "het" | "gen" | "poly";

export type StorySetting =
  | "modern"
  | "ancient"
  | "fantasy"
  | "apocalypse"
  | "yakuza"
  | "abo"
  | "supernatural"
  | "scifi"
  | "school"
  | "office"
  | "other";

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
// Character Types
// ============================================

export interface StoryCharacter {
  id: string;
  name: string;
  fandom: string;
  personality: string[];
  speechPattern?: string;
  portraitUrl?: string;
  isOriginal?: boolean;
}

export interface StoryContext {
  id?: string;
  title?: string;
  fandom: string;
  ships: string[];
  tags: string[];
  plotPoints: string[];
  currentChapter: number;
  characters: StoryCharacter[];
  tone: string;
  setting?: string;
}

// ============================================
// Wizard Session (Advanced Mode - kept for backward compat)
// ============================================

export type WizardStep =
  | "source"
  | "config"
  | "research"
  | "characters"
  | "outline"
  | "complete";

export interface WizardSession {
  step: WizardStep;
  sourceType: SourceType | null;
  sourceName: string | null;
  shipType: ShipType | null;
  setting: StorySetting | null;
  additionalTags: string[];
  researchData: SourceResearchData | null;
  researchProgress?: {
    status: "idle" | "searching" | "complete" | "error";
    currentTask?: string;
    completedTasks: string[];
  };
  characters: StoryCharacter[];
  outline: string;
  userPreferences: {
    tone?: string;
    length?: "short" | "medium" | "long";
    rating?: string;
  };
  draftId?: string;
  lastSavedAt?: Date;
}

// ============================================
// HITL & Content Types
// ============================================

export interface PendingContent {
  type: "outline" | "continuation" | "expansion" | "image";
  content: string;
  approved?: boolean;
}

export interface OOCCheckResult {
  characterId: string;
  characterName: string;
  issues: string[];
  suggestions: string[];
}

export interface GeneratedImage {
  id: string;
  type: "character_portrait" | "scene_illustration" | "cover";
  url: string;
  prompt: string;
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

  // Legacy state (Wizard/Editor mode - kept for backward compat)
  storyContext: StoryContext | null;
  editorContent: string;
  wizardSession: WizardSession | null;
  pendingContent: PendingContent | null;
  oocCheckResults: OOCCheckResult[];
  generatedImages: GeneratedImage[];

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
  storyContext: null,
  editorContent: "",
  wizardSession: null,
  pendingContent: null,
  oocCheckResults: [],
  generatedImages: [],
  logs: [],
  sources: {},
};

export const INITIAL_WIZARD_SESSION: WizardSession = {
  step: "source",
  sourceType: null,
  sourceName: null,
  shipType: null,
  setting: null,
  additionalTags: [],
  researchData: null,
  characters: [],
  outline: "",
  userPreferences: {},
};

// ============================================
// Editor AI Types (for /api/agent/chat)
// ============================================

export type EditorAction = "continue" | "expand" | "polish" | "ooc_check";

export interface EditorAIRequest {
  action: EditorAction;
  content: string;
  selectedText?: string;
  storyContext: StoryContext;
  options?: {
    targetLength?: "short" | "medium" | "long";
    focusArea?: "dialogue" | "description" | "emotion" | "action" | "atmosphere" | "general";
    intensity?: "light" | "medium" | "heavy";
  };
}

export interface EditorAIResponse {
  result: string;
  type: EditorAction;
}

// ============================================
// Static Data Constants
// ============================================

export interface PopularSource {
  name: string;
  displayName: string;
  category: SourceType;
  icon?: string;
}

export const POPULAR_SOURCES: PopularSource[] = [
  // Anime
  { name: "Jujutsu Kaisen", displayName: "Jujutsu Kaisen", category: "anime" },
  { name: "Attack on Titan", displayName: "Attack on Titan", category: "anime" },
  { name: "My Hero Academia", displayName: "My Hero Academia", category: "anime" },
  { name: "Demon Slayer", displayName: "Demon Slayer", category: "anime" },
  { name: "Haikyuu!!", displayName: "Haikyuu!!", category: "anime" },
  { name: "Spy x Family", displayName: "Spy x Family", category: "anime" },
  // Games
  { name: "Genshin Impact", displayName: "Genshin Impact", category: "game" },
  { name: "Honkai: Star Rail", displayName: "Honkai: Star Rail", category: "game" },
  { name: "Arknights", displayName: "Arknights", category: "game" },
  { name: "Final Fantasy", displayName: "Final Fantasy", category: "game" },
  // Novels
  { name: "Mo Dao Zu Shi", displayName: "Mo Dao Zu Shi / The Untamed", category: "novel" },
  { name: "Heaven Official's Blessing", displayName: "Heaven Official's Blessing", category: "novel" },
  { name: "The Scum Villain's Self-Saving System", displayName: "Scum Villain", category: "novel" },
  { name: "Harry Potter", displayName: "Harry Potter", category: "novel" },
  // K-Pop
  { name: "BTS", displayName: "BTS", category: "kpop" },
  { name: "Stray Kids", displayName: "Stray Kids", category: "kpop" },
  { name: "ENHYPEN", displayName: "ENHYPEN", category: "kpop" },
  // TV/Movies
  { name: "Marvel Cinematic Universe", displayName: "MCU", category: "movie" },
  { name: "Supernatural", displayName: "Supernatural", category: "tv" },
  { name: "Sherlock", displayName: "Sherlock BBC", category: "tv" },
];

export interface ShipTypeOption {
  id: ShipType;
  label: string;
  description: string;
}

export const SHIP_TYPE_OPTIONS: ShipTypeOption[] = [
  { id: "bl", label: "BL / Yaoi", description: "Male/male romantic relationship" },
  { id: "gl", label: "GL / Yuri", description: "Female/female romantic relationship" },
  { id: "het", label: "Het / BG", description: "Male/female romantic relationship" },
  { id: "gen", label: "Gen", description: "No romantic focus" },
  { id: "poly", label: "Poly", description: "Multiple relationship dynamics" },
];

export interface StorySettingOption {
  id: StorySetting;
  label: string;
  description: string;
}

export const STORY_SETTING_OPTIONS: StorySettingOption[] = [
  { id: "modern", label: "Modern", description: "Slice of life, office, contemporary" },
  { id: "school", label: "School", description: "High school, university, academy" },
  { id: "ancient", label: "Historical", description: "Palace intrigue, wuxia, xianxia" },
  { id: "fantasy", label: "Fantasy", description: "Magic, medieval, sword & sorcery" },
  { id: "scifi", label: "Sci-Fi", description: "Space, cyberpunk, future" },
  { id: "apocalypse", label: "Apocalypse", description: "Zombie, post-apocalyptic, survival" },
  { id: "yakuza", label: "Crime", description: "Gangs, yakuza, undercover" },
  { id: "abo", label: "ABO", description: "Alpha/Beta/Omega dynamics" },
  { id: "supernatural", label: "Supernatural", description: "Ghosts, vampires, urban legends" },
  { id: "office", label: "Office", description: "Corporate, workplace romance" },
  { id: "other", label: "Other", description: "Custom setting" },
];
