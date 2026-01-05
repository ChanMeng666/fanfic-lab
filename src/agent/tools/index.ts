/**
 * FanFic Lab Agent Tools Index
 * Export all tools for the LangGraph agent
 *
 * Note: Research functionality is handled as a dedicated graph node
 * (not a tool) to avoid CopilotKit ToolMessage format issues (bug #2897)
 * See: src/agent/agent.ts researchNode
 */

export { storyTools, continueStoryTool, expandSceneTool, polishProseTool, generateOutlineTool } from "./story-tools";
export { characterTools, createCharacterTool, checkOOCTool, suggestDialogueTool } from "./character-tools";
export { imageTools, generateCharacterPortraitTool, generateSceneIllustrationTool, generateStoryCoverTool } from "./image-tools";

// Combined array of all backend tools (research is a graph node, not a tool)
import { storyTools } from "./story-tools";
import { characterTools } from "./character-tools";
import { imageTools } from "./image-tools";

export const allBackendTools = [...storyTools, ...characterTools, ...imageTools];
