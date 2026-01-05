/**
 * FanFic Lab LangGraph Agent
 * Main agent workflow for AI-powered fanfiction writing assistance
 *
 * Architecture: Research is handled as a dedicated node (not a tool)
 * to avoid CopilotKit/LangGraph.js ToolMessage format issues (bug #2897)
 */

import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import {
  convertActionsToDynamicStructuredTools,
  copilotkitEmitState,
  copilotkitCustomizeConfig,
} from "@copilotkit/sdk-js/langgraph";
import { tavily } from "@tavily/core";

import { FanficAgentStateAnnotation, FanficAgentState, AgentLog } from "./state";
import { allBackendTools } from "./tools";
import type { SourceResearchData } from "../lib/types/agent-state";

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

// Regular backend tool names (excluding research - handled separately)
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

## Guidelines
- Always respect the user's creative vision
- Maintain consistent character voices
- Use appropriate tone based on the story's genre/tags
- Provide suggestions, not prescriptions
- Be encouraging but also honest about potential issues

## Story Wizard Flow
When helping with the Story Wizard:
1. SOURCE: User selects source via UI
2. CONFIG: User configures ship type and story setting
3. RESEARCH: System automatically researches the source (handled internally)
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
 * Check if the message is a research request
 */
function isResearchRequest(state: FanficAgentState): boolean {
  console.log("[FanFic Agent] isResearchRequest called");
  console.log("[FanFic Agent] Total messages:", state.messages?.length || 0);

  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage) {
    console.log("[FanFic Agent] No last message found");
    return false;
  }

  const messageType = lastMessage._getType();
  console.log("[FanFic Agent] Last message type:", messageType);

  if (messageType !== "human") {
    console.log("[FanFic Agent] Not a human message, skipping research check");
    return false;
  }

  const content = typeof lastMessage.content === "string"
    ? lastMessage.content.toLowerCase()
    : "";

  console.log("[FanFic Agent] Message content (first 200 chars):", content.substring(0, 200));

  const hasResearch = content.includes("research");
  const hasResearchTool = content.includes("research_source_materials");
  const hasForFanfiction = content.includes("for fanfiction");
  const hasSearchFor = content.includes("search for");

  console.log("[FanFic Agent] Pattern matches:", {
    hasResearch,
    hasResearchTool,
    hasForFanfiction,
    hasSearchFor,
  });

  const isResearch = hasResearch && (hasResearchTool || hasForFanfiction || hasSearchFor);
  console.log("[FanFic Agent] isResearchRequest result:", isResearch);

  return isResearch;
}

/**
 * Extract source info from research request
 */
function extractSourceInfo(state: FanficAgentState): { sourceName: string; sourceType: string } | null {
  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage) return null;

  const content = typeof lastMessage.content === "string" ? lastMessage.content : "";

  // Pattern: research "Source Name" (type)
  const match = content.match(/research\s+"([^"]+)"\s*\((\w+)\)/i);
  if (match) {
    return { sourceName: match[1], sourceType: match[2] };
  }

  // Fallback: check wizard session
  if (state.wizardSession?.sourceName && state.wizardSession?.sourceType) {
    return {
      sourceName: state.wizardSession.sourceName,
      sourceType: state.wizardSession.sourceType,
    };
  }

  return null;
}

/**
 * Research Node - Performs Tavily search without tool calling
 * This bypasses the CopilotKit ToolMessage format issue
 */
async function researchNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[FanFic Agent] ========== RESEARCH NODE STARTED ==========");
  console.log("[FanFic Agent] TAVILY_API_KEY present:", !!process.env.TAVILY_API_KEY);
  console.log("[FanFic Agent] TAVILY_API_KEY prefix:", process.env.TAVILY_API_KEY?.substring(0, 10) || "N/A");

  const sourceInfo = extractSourceInfo(state);
  console.log("[FanFic Agent] Extracted source info:", sourceInfo);

  if (!sourceInfo) {
    console.log("[FanFic Agent] ERROR: Could not extract source info");
    return {
      messages: [new AIMessage("I couldn't identify the source to research. Please specify the source name.")],
    };
  }

  const { sourceName, sourceType } = sourceInfo;
  const logs: AgentLog[] = [];
  const sources: Record<string, { title: string; content: string; url: string; score?: number }> = {};

  // Define search queries
  const searchQueries = [
    { focus: "characters", query: `${sourceName} main characters personality traits description wiki` },
    { focus: "plot", query: `${sourceName} plot summary story synopsis overview` },
    { focus: "world", query: `${sourceName} world setting lore background universe` },
    { focus: "ships", query: `${sourceName} popular ships pairings fanfiction relationships` },
  ];

  // Add initial logs
  for (const sq of searchQueries) {
    logs.push({
      message: `🌐 Searching: ${sq.focus} for "${sourceName}"`,
      done: false,
    });
  }

  // Emit initial state
  console.log("[FanFic Agent] Emitting initial state with logs:", logs.length);
  await copilotkitEmitState(config, { logs, sources });
  console.log("[FanFic Agent] Initial state emitted successfully");

  let allResults: Array<{ title: string; content: string; url: string; score: number }> = [];

  // Run searches sequentially and update progress
  for (let i = 0; i < searchQueries.length; i++) {
    const sq = searchQueries[i];
    console.log(`[FanFic Agent] Starting search ${i + 1}/${searchQueries.length}: ${sq.focus}`);

    try {
      console.log(`[FanFic Agent] Calling Tavily API for: ${sq.query.substring(0, 50)}...`);
      const response = await tavilyClient.search(sq.query, {
        maxResults: 5,
        searchDepth: "basic",
      });
      console.log(`[FanFic Agent] Tavily returned ${response.results?.length || 0} results`);

      // Filter results by score
      const filteredResults = response.results
        .filter((r) => r.score > 0.4)
        .map((r) => ({
          title: r.title,
          content: r.content,
          url: r.url,
          score: r.score,
        }));

      allResults = [...allResults, ...filteredResults];

      // Update sources
      for (const result of filteredResults) {
        if (!sources[result.url]) {
          sources[result.url] = result;
        }
      }
    } catch (error) {
      console.error(`[FanFic Agent] Search error for ${sq.focus}:`, error);
      console.error(`[FanFic Agent] Error details:`, error instanceof Error ? error.message : String(error));
    }

    // Mark this log as done
    logs[i].done = true;
    await copilotkitEmitState(config, { logs, sources });
  }

  // Add aggregation log
  logs.push({
    message: "✨ Compiling research results...",
    done: false,
  });
  await copilotkitEmitState(config, { logs, sources });

  // Aggregate results into structured format
  const researchData = aggregateSearchResults(sourceName, sourceType, allResults);

  // Mark aggregation as done
  logs[logs.length - 1].done = true;

  // Update wizard session with research data
  // Create a new session if one doesn't exist (important for state detection)
  const updatedWizardSession = state.wizardSession ? {
    ...state.wizardSession,
    researchData,
    step: "characters" as const,
  } : {
    // Create new wizard session with research data
    step: "characters" as const,
    sourceType: sourceType as "anime" | "manga" | "novel" | "game" | "movie" | "tv" | "other",
    sourceName,
    shipType: null,
    setting: null,
    additionalTags: [],
    researchData,
    characters: [],
    outline: "",
    userPreferences: {},
  };

  console.log("[FanFic Agent] Research data created:", {
    charactersFound: researchData.mainCharacters.length,
    shipsFound: researchData.popularShips.length,
    sourcesFound: Object.keys(sources).length,
  });
  console.log("[FanFic Agent] Updated wizardSession:", {
    step: updatedWizardSession.step,
    sourceName: updatedWizardSession.sourceName,
    hasResearchData: !!updatedWizardSession.researchData,
    mainCharactersCount: updatedWizardSession.researchData?.mainCharacters?.length || 0,
  });

  await copilotkitEmitState(config, {
    logs,
    sources,
    wizardSession: updatedWizardSession,
  });

  console.log("[FanFic Agent] Final state emitted with wizardSession");

  return {
    logs,
    sources,
    wizardSession: updatedWizardSession,
    messages: [new AIMessage(`Research complete for "${sourceName}"! Found ${researchData.mainCharacters.length} characters and ${Object.keys(sources).length} sources. The research results are ready for review.`)],
  };
}

/**
 * Aggregate search results into structured SourceResearchData
 */
function aggregateSearchResults(
  sourceName: string,
  sourceType: string,
  results: Array<{ title: string; content: string; url: string; score: number }>
): SourceResearchData {
  // Combine all content for analysis
  const combinedContent = results
    .map((r) => `[${r.title}]\n${r.content}`)
    .join("\n\n");

  // Extract character names from content
  const characterPatterns = [
    /(?:main character|protagonist|character)s?\s*(?:include|are|:)\s*([^.]+)/gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|are)\s+(?:the|a)\s+(?:main|primary|central)/gi,
  ];

  const characterNames: Set<string> = new Set();
  for (const pattern of characterPatterns) {
    const matches = combinedContent.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const names = match[1].split(/[,and]+/).map((n) => n.trim());
        names.forEach((n) => {
          if (n.length > 2 && n.length < 50) characterNames.add(n);
        });
      }
    }
  }

  // Extract ship patterns
  const shipPatterns = [
    /(?:ship|pairing|couple)s?\s*(?:include|are|:)\s*([^.]+)/gi,
    /([A-Z][a-z]+)\s*[x×\/]\s*([A-Z][a-z]+)/g,
  ];

  const ships: Set<string> = new Set();
  for (const pattern of shipPatterns) {
    const matches = combinedContent.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[2]) {
        ships.add(`${match[1]} x ${match[2]}`);
      } else if (match[1]) {
        const shipNames = match[1].split(/[,and]+/).map((n) => n.trim());
        shipNames.forEach((n) => {
          if (n.length > 2 && n.length < 50) ships.add(n);
        });
      }
    }
  }

  // Build structured data
  return {
    originalPlot: results
      .filter((r) => r.title.toLowerCase().includes("plot") || r.content.toLowerCase().includes("story"))
      .slice(0, 2)
      .map((r) => r.content)
      .join("\n\n") || `${sourceName} is a ${sourceType} with a rich narrative.`,

    mainCharacters: Array.from(characterNames).slice(0, 10).map((name) => ({
      name,
      description: `A character from ${sourceName}`,
      traits: ["complex", "memorable"],
      relationships: [],
    })),

    worldSettings: results
      .filter((r) => r.title.toLowerCase().includes("world") || r.content.toLowerCase().includes("setting"))
      .slice(0, 1)
      .map((r) => r.content)
      .join("\n") || `The world of ${sourceName} - a unique ${sourceType} setting.`,

    popularShips: Array.from(ships).slice(0, 10),

    canonRelationships: [],

    searchSources: results.slice(0, 5).map((r) => r.url),
  };
}

/**
 * Main chat node - handles conversation with the user
 */
async function chatNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[FanFic Agent] ========== CHAT NODE STARTED ==========");
  console.log("[FanFic Agent] Messages count:", state.messages?.length || 0);

  const model = new ChatOpenAI({
    temperature: 0.8,
    model: "gpt-4o",
  });

  // Get frontend tools from CopilotKit
  const frontendTools = convertActionsToDynamicStructuredTools(
    state.copilotkit?.actions ?? []
  );

  // Combine frontend and backend tools (research is handled separately)
  const allTools = [...frontendTools, ...allBackendTools];

  // Bind tools to the model
  const modelWithTools = model.bindTools(allTools, { parallel_tool_calls: false });

  // Build context-aware system prompt
  const systemPrompt = buildSystemPrompt(state);

  // Emit state to frontend
  await copilotkitEmitState(config, state);

  // Invoke the model
  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt), ...state.messages],
    config
  );

  return { messages: [response] };
}

/**
 * Tool node for backend tools (non-research)
 */
async function toolNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  const customConfig = copilotkitCustomizeConfig(config, { emitMessages: false });

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  const toolMessages: ToolMessage[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.name;

    if (regularToolNames.has(toolName)) {
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

  return { messages: toolMessages };
}

/**
 * Initial routing - check if this is a research request
 */
function routeFromStart(state: FanficAgentState): string {
  console.log("[FanFic Agent] ========== ROUTE FROM START ==========");
  const isResearch = isResearchRequest(state);
  const destination = isResearch ? "research_node" : "chat_node";
  console.log("[FanFic Agent] Routing to:", destination);
  return destination;
}

/**
 * Routing after chat node
 */
function routeAfterChat(state: FanficAgentState): string {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    const hasBackendToolCall = lastMessage.tool_calls.some(
      (tc) => regularToolNames.has(tc.name)
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
function routeAfterTool(): string {
  return "chat_node";
}

/**
 * Route after research
 */
function routeAfterResearch(): string {
  return END;
}

// Build the graph
const workflow = new StateGraph(FanficAgentStateAnnotation)
  .addNode("chat_node", chatNode)
  .addNode("tool_node", toolNode)
  .addNode("research_node", researchNode)
  .addConditionalEdges(START, routeFromStart)
  .addConditionalEdges("chat_node", routeAfterChat)
  .addConditionalEdges("tool_node", routeAfterTool)
  .addConditionalEdges("research_node", routeAfterResearch);

// Create memory saver for state persistence
const memory = new MemorySaver();

// Compile the graph with checkpointer
export const graph = workflow.compile({
  checkpointer: memory,
});

// Export for LangGraph CLI
export default graph;
