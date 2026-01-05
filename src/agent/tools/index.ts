/**
 * FanFic Lab Agent Tools Index
 * Export all tools for the LangGraph agent
 */

export { storyTools, continueStoryTool, expandSceneTool, polishProseTool, generateOutlineTool } from "./story-tools";
export { characterTools, createCharacterTool, checkOOCTool, suggestDialogueTool } from "./character-tools";
export { imageTools, generateCharacterPortraitTool, generateSceneIllustrationTool, generateStoryCoverTool } from "./image-tools";
export { researchTools, researchSourceTool, aggregateResearchTool, characterLookupTool } from "./research-tools";

// Combined array of all backend tools
import { storyTools } from "./story-tools";
import { characterTools } from "./character-tools";
import { imageTools } from "./image-tools";
import { researchTools } from "./research-tools";

export const allBackendTools = [...storyTools, ...characterTools, ...imageTools, ...researchTools];
