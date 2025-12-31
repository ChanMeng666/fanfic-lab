/**
 * FanFic Lab LangGraph Agent
 * Main agent workflow for AI-powered fanfiction writing assistance
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, AIMessage } from "@langchain/core/messages";
import {
  convertActionsToDynamicStructuredTools,
  copilotkitEmitState,
} from "@copilotkit/sdk-js/langgraph";

import { FanficAgentStateAnnotation, FanficAgentState } from "./state";

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
- Be encouraging but also honest about potential issues`;

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
${ws.fandom ? `- Selected Fandom: ${ws.fandom}` : ""}
${ws.ship ? `- Selected Ship: ${ws.ship}` : ""}
${ws.characters.length > 0 ? `- Characters: ${ws.characters.map((c) => c.name).join(", ")}` : ""}
${ws.plotIdeas.length > 0 ? `- Plot Ideas: ${ws.plotIdeas.join("; ")}` : ""}`;
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

  // Bind tools to the model
  const modelWithTools = model.bindTools(frontendTools);

  // Build context-aware system prompt
  const systemPrompt = buildSystemPrompt(state);

  // Invoke the model
  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt), ...state.messages],
    config
  );

  return { messages: [response] };
}

/**
 * Routing function to determine next node
 */
function shouldContinue(state: FanficAgentState): string {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // If there are tool calls, we need to handle them
  if (lastMessage.tool_calls?.length) {
    // For now, all tools are frontend tools handled by CopilotKit
    // In Phase 2+, we'll add backend tools and route to tool_node
    return END;
  }

  return END;
}

// Build the graph
const workflow = new StateGraph(FanficAgentStateAnnotation)
  .addNode("chat_node", chatNode)
  .addEdge(START, "chat_node")
  .addConditionalEdges("chat_node", shouldContinue);

// Create memory saver for state persistence
const memory = new MemorySaver();

// Compile the graph with checkpointer
export const graph = workflow.compile({
  checkpointer: memory,
});

// Export for LangGraph CLI
export default graph;
