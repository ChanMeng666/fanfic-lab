/**
 * FanFic Lab LangGraph Agent
 * Main agent workflow for AI-powered fanfiction writing assistance
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import {
  convertActionsToDynamicStructuredTools,
  copilotkitEmitState,
} from "@copilotkit/sdk-js/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { FanficAgentStateAnnotation, FanficAgentState } from "./state";
import { allBackendTools } from "./tools";

/**
 * Build the system prompt based on current state
 */
function buildSystemPrompt(state: FanficAgentState): string {
  let prompt = `You are a creative fanfiction writing assistant with deep knowledge of popular fandoms, ships, and tropes.

## Your Personality
- Enthusiastic about fanfiction and fandom culture
- Encouraging and supportive of creative ideas
- Knowledgeable about character voices and canon details
- Respectful of content preferences and ratings
- Familiar with common fandom terminology (ship, OTP, AU, canon, fanon, etc.)

## Your Capabilities
You can help users with:
- Brainstorming story ideas and plot points
- Developing characters (canon and OC)
- Writing story continuations
- Expanding and polishing prose
- Checking for out-of-character moments
- Setting up new stories with the Creative Wizard

## Guidelines
- Always respect the user's creative vision
- Maintain consistent character voices
- Use appropriate tone based on the story's genre/tags
- Provide suggestions, not prescriptions
- Be encouraging but also honest about potential issues

## Story Wizard Flow (New 6-Step Process)
When helping with the Story Wizard, follow this flow:
1. SOURCE: User selects source (anime, manga, game, etc.) via UI component
2. CONFIG: User configures ship type and story setting via UI component
3. RESEARCH: Use research_source_materials tool to search for character info, plot, world settings, and popular ships. Then use aggregate_research to compile the results.
4. CHARACTERS: User selects characters from research results via UI component
5. OUTLINE: Use generate_outline tool to create story outline, then present for approval
6. COMPLETE: Start writing mode after outline approval

## Research Tools
When researching a source, you MUST call the research tools in this order:
1. Call research_source_materials with searchFocus="characters"
2. Call research_source_materials with searchFocus="plot"
3. Call research_source_materials with searchFocus="world"
4. Call research_source_materials with searchFocus="ships"
5. Call aggregate_research with ALL the results to compile into structured JSON

IMPORTANT: After calling aggregate_research, you MUST output the final research data as a valid JSON object with this exact structure:
{
  "originalPlot": "string",
  "mainCharacters": [{"name": "string", "description": "string", "traits": ["array"], "relationships": ["array"]}],
  "worldSettings": "string",
  "popularShips": ["array of ship names"],
  "canonRelationships": ["array"],
  "searchSources": ["array of URLs"]
}

The frontend will parse this JSON to display the research results.`;

  // Add story context if available
  if (state.storyContext) {
    const ctx = state.storyContext;
    prompt += `

## Current Story Context
- Fandom: ${ctx.fandom}
- Ships: ${ctx.ships.length > 0 ? ctx.ships.join(", ") : "None specified"}
- Tags: ${ctx.tags.length > 0 ? ctx.tags.join(", ") : "None specified"}
- Tone: ${ctx.tone}
- Characters: ${ctx.characters.map((c) => c.name).join(", ") || "None defined"}
- Current Chapter: ${ctx.currentChapter}
${ctx.plotPoints.length > 0 ? `- Plot Points: ${ctx.plotPoints.join("; ")}` : ""}
${ctx.setting ? `- Setting: ${ctx.setting}` : ""}`;
  }

  // Add wizard context if in wizard mode
  if (state.wizardSession) {
    const ws = state.wizardSession;
    prompt += `

## Creative Wizard Session Active
Currently helping user set up a new story.
- Current Step: ${ws.step}
${ws.sourceName ? `- Source: ${ws.sourceName} (${ws.sourceType})` : ""}
${ws.shipType ? `- Ship Type: ${ws.shipType}` : ""}
${ws.setting ? `- Setting: ${ws.setting}` : ""}
${ws.additionalTags?.length ? `- Tags: ${ws.additionalTags.join(", ")}` : ""}
${ws.characters.length > 0 ? `- Characters: ${ws.characters.map((c) => c.name).join(", ")}` : ""}
${ws.researchData ? `- Research Complete: Yes (${ws.researchData.mainCharacters.length} characters found)` : ""}
${ws.outline ? `- Outline: Ready` : ""}`;
  }

  return prompt;
}

/**
 * Main chat node - handles conversation with the user
 */
async function chatNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  const model = new ChatOpenAI({
    temperature: 0.8, // Higher temperature for creative writing
    model: "gpt-4o",
  });

  // Get frontend tools from CopilotKit
  const frontendTools = convertActionsToDynamicStructuredTools(
    state.copilotkit?.actions ?? []
  );

  // Combine frontend and backend tools
  const allTools = [...frontendTools, ...allBackendTools];

  // Bind tools to the model
  const modelWithTools = model.bindTools(allTools);

  // Build context-aware system prompt
  const systemPrompt = buildSystemPrompt(state);

  // Emit state to frontend for progress updates
  await copilotkitEmitState(config, state);

  // Invoke the model
  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt), ...state.messages],
    config
  );

  return { messages: [response] };
}

// Backend tool names for routing
const backendToolNames = new Set(allBackendTools.map((t) => t.name));

/**
 * Routing function to determine next node
 */
function shouldContinue(state: FanficAgentState): string {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // If there are tool calls, check if they're backend tools
  if (lastMessage.tool_calls?.length) {
    // Check if any tool calls are for backend tools
    const hasBackendToolCall = lastMessage.tool_calls.some((tc) =>
      backendToolNames.has(tc.name)
    );

    if (hasBackendToolCall) {
      return "tool_node";
    }

    // Frontend tools are handled by CopilotKit
    return END;
  }

  return END;
}

/**
 * Route after tool execution
 */
function afterToolExecution(state: FanficAgentState): string {
  // Continue the conversation after tool execution
  return "chat_node";
}

// Create tool node for backend tool execution
const toolNode = new ToolNode(allBackendTools);

// Build the graph
const workflow = new StateGraph(FanficAgentStateAnnotation)
  .addNode("chat_node", chatNode)
  .addNode("tool_node", toolNode)
  .addEdge(START, "chat_node")
  .addConditionalEdges("chat_node", shouldContinue)
  .addConditionalEdges("tool_node", afterToolExecution);

// Create memory saver for state persistence
const memory = new MemorySaver();

// Compile the graph with checkpointer
export const graph = workflow.compile({
  checkpointer: memory,
});

// Export for LangGraph CLI
export default graph;
