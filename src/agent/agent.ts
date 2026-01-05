/**
 * FanFic Lab LangGraph Agent
 * Main agent workflow for AI-powered fanfiction writing assistance
 *
 * Architecture based on open-research-ANA example:
 * - Custom tool node for state injection and handling
 * - copilotkitEmitState for real-time progress updates
 * - Research tools return { state, message } for state sync
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, AIMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import {
  convertActionsToDynamicStructuredTools,
  copilotkitEmitState,
  copilotkitCustomizeConfig,
} from "@copilotkit/sdk-js/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { FanficAgentStateAnnotation, FanficAgentState } from "./state";
import { allBackendTools, researchBackendTools } from "./tools";

// Research tool names for special handling
const researchToolNames = new Set(researchBackendTools.map((t) => t.name));
const researchToolsByName = Object.fromEntries(researchBackendTools.map((t) => [t.name, t]));

// Regular backend tool names
const regularToolNames = new Set(allBackendTools.map((t) => t.name));

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

## Research Tools
When the user selects a source for fanfiction writing, use the research_source_materials tool to search the web for:
- Character information (names, traits, relationships)
- Plot summaries
- World settings and lore
- Popular ships and pairings

The research tool will search Tavily and return structured data. The frontend will display progress via state.logs.

## Guidelines
- Always respect the user's creative vision
- Maintain consistent character voices
- Use appropriate tone based on the story's genre/tags
- Provide suggestions, not prescriptions
- Be encouraging but also honest about potential issues

## Story Wizard Flow
When helping with the Story Wizard, follow this flow:
1. SOURCE: User selects source via UI
2. CONFIG: User configures ship type and story setting
3. RESEARCH: Call research_source_materials tool to search for info
4. CHARACTERS: User selects characters from research results
5. OUTLINE: Use generate_outline tool to create story outline
6. COMPLETE: Start writing mode after outline approval`;

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

  // Combine frontend, backend, and research tools
  const allTools = [...frontendTools, ...allBackendTools, ...researchBackendTools];

  // Bind tools to the model (disable parallel tool calls for research)
  const modelWithTools = model.bindTools(allTools, { parallel_tool_calls: false });

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

/**
 * Custom tool node that handles research tools with state injection
 * Based on open-research-ANA pattern
 */
async function customToolNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  // Disable message emission for intermediate tool messages
  const customConfig = copilotkitCustomizeConfig(config, { emitMessages: false });

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  const toolMessages: ToolMessage[] = [];
  let updatedState: Partial<FanficAgentState> = {};

  for (const toolCall of toolCalls) {
    const toolName = toolCall.name;

    // Check if this is a research tool (needs special handling)
    if (researchToolNames.has(toolName)) {
      // Inject state into tool args
      const argsWithState = {
        ...toolCall.args,
        state: {
          logs: state.logs || [],
          sources: state.sources || {},
          wizardSession: state.wizardSession,
        },
      };

      // Invoke research tool with state
      const tool = researchToolsByName[toolName];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool as any).invoke(argsWithState, customConfig);

      // Research tools return { state, message }
      if (result && typeof result === "object" && "state" in result && "message" in result) {
        const { state: newState, message } = result as { state: Partial<FanficAgentState>; message: string };

        // Merge state updates
        updatedState = {
          ...updatedState,
          logs: newState.logs || updatedState.logs,
          sources: newState.sources || updatedState.sources,
          wizardSession: newState.wizardSession || updatedState.wizardSession,
        };

        // Create tool message
        toolMessages.push(new ToolMessage({
          content: message,
          name: toolName,
          tool_call_id: toolCall.id!,
        }));

        // Emit updated state
        await copilotkitEmitState(customConfig, updatedState);
      }
    } else if (regularToolNames.has(toolName)) {
      // Regular backend tools - use standard invocation
      const tool = allBackendTools.find((t) => t.name === toolName);
      if (tool) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (tool as any).invoke(toolCall.args, customConfig);
          toolMessages.push(new ToolMessage({
            content: typeof result === "string" ? result : JSON.stringify(result),
            name: toolName,
            tool_call_id: toolCall.id!,
          }));
        } catch (error) {
          console.error(`Tool ${toolName} error:`, error);
          toolMessages.push(new ToolMessage({
            content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            name: toolName,
            tool_call_id: toolCall.id!,
          }));
        }
      }
    }
  }

  return {
    messages: toolMessages,
    ...updatedState,
  };
}

/**
 * Routing function to determine next node
 */
function shouldContinue(state: FanficAgentState): string {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // If there are tool calls, check if they're backend/research tools
  if (lastMessage.tool_calls?.length) {
    const hasBackendToolCall = lastMessage.tool_calls.some(
      (tc) => regularToolNames.has(tc.name) || researchToolNames.has(tc.name)
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
 * Route after tool execution - always go back to chat
 */
function afterToolExecution(): string {
  return "chat_node";
}

// Build the graph
const workflow = new StateGraph(FanficAgentStateAnnotation)
  .addNode("chat_node", chatNode)
  .addNode("tool_node", customToolNode)
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
