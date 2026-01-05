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
import { getCachedResearch, saveResearchToCache } from "./services/research-cache";

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
 *
 * Includes caching to save API costs:
 * - First checks database cache for existing research
 * - If cache hit, returns cached data immediately (saves Tavily + OpenAI costs)
 * - If cache miss, performs full research and saves to cache
 */
async function researchNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[FanFic Agent] ========== RESEARCH NODE STARTED ==========");

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

  // ========== STEP 1: Check Cache First ==========
  logs.push({
    message: `🔍 Checking research cache for "${sourceName}"...`,
    done: false,
  });
  await copilotkitEmitState(config, { logs, sources });

  const cachedResearch = await getCachedResearch(sourceName, sourceType);

  if (cachedResearch) {
    // CACHE HIT - Return cached data immediately (saves API costs!)
    console.log("[FanFic Agent] ✅ CACHE HIT! Using cached research data");
    logs[0].done = true;
    logs[0].message = `✅ Found cached research for "${sourceName}"!`;

    logs.push({
      message: "📚 Loading previously researched data...",
      done: true,
    });

    await copilotkitEmitState(config, { logs, sources });

    // Build wizard session with cached data
    const updatedWizardSession = state.wizardSession ? {
      ...state.wizardSession,
      researchData: cachedResearch,
      step: "characters" as const,
    } : {
      step: "characters" as const,
      sourceType: sourceType as "anime" | "manga" | "novel" | "game" | "movie" | "tv" | "other",
      sourceName,
      shipType: null,
      setting: null,
      additionalTags: [],
      researchData: cachedResearch,
      characters: [],
      outline: "",
      userPreferences: {},
    };

    await copilotkitEmitState(config, {
      logs,
      sources,
      wizardSession: updatedWizardSession,
    });

    return {
      logs,
      sources,
      wizardSession: updatedWizardSession,
      messages: [new AIMessage(`Found cached research for "${sourceName}"! ${cachedResearch.mainCharacters.length} characters and research data loaded from previous searches.`)],
    };
  }

  // ========== STEP 2: Cache Miss - Perform Full Research ==========
  console.log("[FanFic Agent] ❌ CACHE MISS - Performing full research");
  logs[0].done = true;
  logs[0].message = `🔍 No cache found, starting fresh research...`;

  console.log("[FanFic Agent] TAVILY_API_KEY present:", !!process.env.TAVILY_API_KEY);

  // Define search queries
  const searchQueries = [
    { focus: "characters", query: `${sourceName} main characters personality traits description wiki` },
    { focus: "plot", query: `${sourceName} plot summary story synopsis overview` },
    { focus: "world", query: `${sourceName} world setting lore background universe` },
    { focus: "ships", query: `${sourceName} popular ships pairings fanfiction relationships` },
  ];

  // Add search logs
  for (const sq of searchQueries) {
    logs.push({
      message: `🌐 Searching: ${sq.focus} for "${sourceName}"`,
      done: false,
    });
  }

  await copilotkitEmitState(config, { logs, sources });

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

    // Mark this log as done (offset by 1 for cache check log)
    logs[i + 1].done = true;
    await copilotkitEmitState(config, { logs, sources });
  }

  // Add aggregation log
  logs.push({
    message: "🤖 AI is summarizing research results...",
    done: false,
  });
  await copilotkitEmitState(config, { logs, sources });

  // Aggregate results into structured format using LLM
  const researchData = await aggregateSearchResultsWithLLM(sourceName, sourceType, allResults);

  // ========== STEP 3: Save to Cache ==========
  logs.push({
    message: "💾 Saving research to cache for future users...",
    done: false,
  });
  await copilotkitEmitState(config, { logs, sources });

  const cacheSaved = await saveResearchToCache(sourceName, sourceType, researchData);
  logs[logs.length - 1].done = true;
  logs[logs.length - 1].message = cacheSaved
    ? "💾 Research cached successfully!"
    : "💾 Cache save skipped (database not available)";

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
 * Aggregate search results into structured SourceResearchData using LLM
 * Uses GPT to intelligently summarize and extract meaningful information
 */
async function aggregateSearchResultsWithLLM(
  sourceName: string,
  sourceType: string,
  results: Array<{ title: string; content: string; url: string; score: number }>
): Promise<SourceResearchData> {
  console.log("[FanFic Agent] Starting LLM-based aggregation for:", sourceName);

  // Combine all content for LLM analysis
  const combinedContent = results
    .map((r) => `### ${r.title}\n${r.content}`)
    .join("\n\n---\n\n");

  console.log("[FanFic Agent] Combined content length:", combinedContent.length);

  // Initialize LLM for summarization
  const summarizer = new ChatOpenAI({
    temperature: 0.3,
    model: "gpt-4o-mini", // Use mini for cost efficiency
  });

  const extractionPrompt = `You are an expert in analyzing source materials for fanfiction writing. Analyze the following search results about "${sourceName}" (${sourceType}) and extract structured information.

## Search Results:
${combinedContent.slice(0, 12000)} // Limit to avoid token overflow

## Instructions:
Extract and summarize the following information in JSON format. Be specific, accurate, and helpful for fanfiction writers.

Return ONLY valid JSON in this exact format:
{
  "plotSummary": "A 2-3 paragraph summary of the main plot, themes, and story arcs. Include key events and conflicts.",
  "worldSettings": "A detailed description of the world/setting including: time period, locations, magic systems or technology, social structures, and any unique worldbuilding elements.",
  "characters": [
    {
      "name": "Character Full Name",
      "description": "2-3 sentences describing who they are, their role in the story, and their background",
      "traits": ["trait1", "trait2", "trait3", "trait4"],
      "relationships": ["relationship description 1", "relationship description 2"]
    }
  ],
  "popularShips": ["Character A x Character B", "Character C x Character D"],
  "canonRelationships": ["Description of canon relationship 1", "Description of canon relationship 2"],
  "fanficTips": "Brief tips for writing fanfiction in this fandom, including common tropes and what fans enjoy"
}

Important guidelines:
- For characters: Include 5-10 main characters with REAL descriptions and personality traits
- For ships: Use the format "Character A x Character B" - include both canon and popular fan pairings
- For world settings: Be detailed about the setting, time period, and any special systems (magic, cultivation, etc.)
- All information should be factually accurate based on the search results
- If information is not available in the search results, make reasonable inferences but note uncertainty`;

  try {
    const response = await summarizer.invoke([
      new SystemMessage("You are a helpful assistant that extracts and summarizes information about fictional works for fanfiction writers. Always respond with valid JSON only."),
      new HumanMessage(extractionPrompt),
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    console.log("[FanFic Agent] LLM response length:", responseText.length);

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    console.log("[FanFic Agent] Successfully parsed LLM response");

    // Build structured data from LLM response
    return {
      originalPlot: parsed.plotSummary || `${sourceName} is a ${sourceType} with a rich narrative.`,

      mainCharacters: (parsed.characters || []).slice(0, 10).map((char: {
        name: string;
        description?: string;
        traits?: string[];
        relationships?: string[];
      }) => ({
        name: char.name,
        description: char.description || `A character from ${sourceName}`,
        traits: char.traits || ["complex", "memorable"],
        relationships: char.relationships || [],
      })),

      worldSettings: parsed.worldSettings || `The world of ${sourceName} - a unique ${sourceType} setting.`,

      popularShips: parsed.popularShips || [],

      canonRelationships: parsed.canonRelationships || [],

      searchSources: results.slice(0, 5).map((r) => r.url),
    };
  } catch (error) {
    console.error("[FanFic Agent] LLM aggregation failed:", error);
    console.log("[FanFic Agent] Falling back to basic extraction");

    // Fallback to basic extraction if LLM fails
    return fallbackAggregation(sourceName, sourceType, results);
  }
}

/**
 * Fallback aggregation using basic text extraction (used if LLM fails)
 */
function fallbackAggregation(
  sourceName: string,
  sourceType: string,
  results: Array<{ title: string; content: string; url: string; score: number }>
): SourceResearchData {
  console.log("[FanFic Agent] Using fallback aggregation");

  const combinedContent = results.map((r) => r.content).join(" ");

  // Basic character extraction
  const characterNames: Set<string> = new Set();
  const namePatterns = [
    /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g,
  ];

  for (const pattern of namePatterns) {
    const matches = combinedContent.matchAll(pattern);
    for (const match of matches) {
      const name = match[1]?.trim();
      const excludeWords = ['The', 'This', 'That', 'When', 'Where', 'What', 'Which'];
      if (name && name.length > 4 && name.length < 30 && !excludeWords.includes(name.split(' ')[0])) {
        characterNames.add(name);
      }
    }
  }

  return {
    originalPlot: results
      .slice(0, 2)
      .map((r) => r.content)
      .join("\n\n") || `${sourceName} is a ${sourceType} with a rich narrative.`,

    mainCharacters: Array.from(characterNames).slice(0, 8).map((name) => ({
      name,
      description: `A character from ${sourceName}. More details will be available after manual review.`,
      traits: ["to be determined"],
      relationships: [],
    })),

    worldSettings: `The setting of ${sourceName}. Please review the source material for detailed worldbuilding information.`,

    popularShips: [],

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
