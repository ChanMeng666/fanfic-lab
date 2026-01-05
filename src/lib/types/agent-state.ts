/**
 * FanFic Lab Agent State Types
 * Shared between frontend (React) and backend (LangGraph.js agent)
 */

// ============================================
// Source & Configuration Types (Wizard Steps 1-2)
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

export type WizardStep =
  | "source"
  | "config"
  | "research"
  | "characters"
  | "outline"
  | "complete";

// ============================================
// Research Data Types (Wizard Step 3)
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
  step: WizardStep;

  // Step 1: Source Selection
  sourceType: SourceType | null;
  sourceName: string | null;

  // Step 2: Story Configuration
  shipType: ShipType | null;
  setting: StorySetting | null;
  additionalTags: string[];

  // Step 3: AI Research Results
  researchData: SourceResearchData | null;
  researchProgress?: {
    status: "idle" | "searching" | "complete" | "error";
    currentTask?: string;
    completedTasks: string[];
  };

  // Step 4: Characters
  characters: StoryCharacter[];

  // Step 5: Outline
  outline: string;

  // User Preferences
  userPreferences: {
    tone?: string;
    length?: "short" | "medium" | "long";
    rating?: string;
  };

  // Draft tracking
  draftId?: string;
  lastSavedAt?: Date;

  // Legacy fields for backward compatibility
  fandom?: string;
  ship?: string;
  ships?: string[];
  tags?: string[];
  plotIdeas?: string[];
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

// Agent progress log entry (used by useCoAgentStateRender for progress display)
export interface AgentLog {
  message: string;
  done: boolean;
}

// Research source from Tavily search
export interface ResearchSource {
  title: string;
  content: string;
  url: string;
  score?: number;
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

  // Agent progress logs (for useCoAgentStateRender display)
  logs: AgentLog[];

  // Research sources from Tavily search
  sources: Record<string, ResearchSource>;
}

// Initial state for useCoAgent
export const INITIAL_AGENT_STATE: FanficAgentState = {
  storyContext: null,
  editorContent: "",
  wizardSession: null,
  pendingContent: null,
  oocCheckResults: [],
  generatedImages: [],
  logs: [],
  sources: {},
};

// Initial wizard session state
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
