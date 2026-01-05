/**
 * FanFic Lab Agent Tools Index
 * Export all tools for the LangGraph agent
 */

export { storyTools, continueStoryTool, expandSceneTool, polishProseTool, generateOutlineTool } from "./story-tools";
export { characterTools, createCharacterTool, checkOOCTool, suggestDialogueTool } from "./character-tools";
export { imageTools, generateCharacterPortraitTool, generateSceneIllustrationTool, generateStoryCoverTool } from "./image-tools";
export { researchTools, researchSourceTool, characterLookupTool } from "./research-tools";

// Combined array of all backend tools
import { storyTools } from "./story-tools";
import { characterTools } from "./character-tools";
import { imageTools } from "./image-tools";
import { researchTools } from "./research-tools";

// Research tools use custom handling (state injection + state return)
// See agent.ts customToolNode for implementation
export const allBackendTools = [...storyTools, ...characterTools, ...imageTools];
export const researchBackendTools = [...researchTools];
