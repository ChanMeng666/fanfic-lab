/**
 * FanFic Lab Agent Tools Index
 * Export all tools for the LangGraph agent
 *
 * Note: Research and Outline functionality are handled as dedicated graph nodes
 * (not tools) to avoid CopilotKit ToolMessage format issues (bug #2897)
 * See: src/agent/agent.ts researchNode, outlineNode
 */

export { storyTools, continueStoryTool, expandSceneTool, polishProseTool, generateOutlineTool } from "./story-tools";
export { characterTools, createCharacterTool, checkOOCTool, suggestDialogueTool } from "./character-tools";
export { imageTools, generateCharacterPortraitTool, generateSceneIllustrationTool, generateStoryCoverTool } from "./image-tools";

// Combined array of all backend tools
// Note: generate_outline and research are handled as dedicated graph nodes, not tools
import { continueStoryTool, expandSceneTool, polishProseTool } from "./story-tools";
import { characterTools } from "./character-tools";
import { imageTools } from "./image-tools";

// Exclude generateOutlineTool - it's handled by outlineNode to avoid ToolMessage format issues
export const allBackendTools = [continueStoryTool, expandSceneTool, polishProseTool, ...characterTools, ...imageTools];
