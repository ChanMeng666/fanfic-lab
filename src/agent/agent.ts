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
// Note: Cache is now handled on Vercel side via /api/research-cache
// This eliminates Prisma dependency on Railway

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

// Regular backend tool names (excluding research - handled separately)
const regularToolNames = new Set(allBackendTools.map((t) => t.name));

/**
 * Extract wizard context from CopilotKit readable data
 * CopilotKit context is an array of { description: string; value: string | object }
 */
function extractContextFromReadable(state: FanficAgentState): {
  sourceName?: string;
  sourceType?: string;
  shipType?: string;
  setting?: string;
  characters?: string[];
  tags?: string[];
  outline?: string;
  researchData?: { mainCharacters: Array<{ name: string }>; popularShips: string[] };
} | null {
  // CopilotKit passes readable data through copilotkit.context as an array
  // The wizard page uses useCopilotReadable to share session state
  type CopilotContext = {
    context?: Array<{ description: string; value: unknown }>;
  };
  const copilotState = state.copilotkit as CopilotContext | undefined;

  console.log("[extractContextFromReadable] copilotState exists:", !!copilotState);
  console.log("[extractContextFromReadable] copilotState.context exists:", !!copilotState?.context);
  console.log("[extractContextFromReadable] copilotState.context is array:", Array.isArray(copilotState?.context));

  if (copilotState?.context && Array.isArray(copilotState.context)) {
    // Log each context item for debugging
    console.log("[extractContextFromReadable] Context items:");
    copilotState.context.forEach((c, i) => {
      console.log(`  [${i}] description: "${c.description}", value type: ${typeof c.value}`);
      if (typeof c.value === "string") {
        console.log(`  [${i}] value (string, first 200 chars): ${c.value.substring(0, 200)}`);
      } else if (typeof c.value === "object" && c.value !== null) {
        console.log(`  [${i}] value (object keys): ${Object.keys(c.value as object).join(", ")}`);
      }
    });

    // Find the wizard session context - try multiple matching strategies
    let wizardContext = copilotState.context.find(
      (c) => c.description?.includes("wizard") || c.description?.includes("session")
    );

    // Fallback 1: If only one context item exists, use it directly
    if (!wizardContext && copilotState.context.length === 1) {
      console.log("[extractContextFromReadable] Only one context item, using it directly");
      wizardContext = copilotState.context[0];
    }

    // Fallback 2: Try to find context item that has wizard-like data structure
    if (!wizardContext) {
      console.log("[extractContextFromReadable] No context found by description match, trying data structure fallback...");
      wizardContext = copilotState.context.find((c) => {
        // Most likely the value is a JSON string (CopilotKit stringifies values)
        if (typeof c.value === "string") {
          try {
            const parsed = JSON.parse(c.value);
            return parsed.sourceName || parsed.characters || parsed.step;
          } catch {
            return false;
          }
        }
        // Less common: value might be an object directly
        if (typeof c.value === "object" && c.value !== null) {
          const keys = Object.keys(c.value as object);
          return keys.includes("sourceName") || keys.includes("characters") || keys.includes("step");
        }
        return false;
      });
    }

    console.log("[extractContextFromReadable] Found wizardContext:", !!wizardContext);

    if (wizardContext) {
      let ws: Record<string, unknown>;

      // Handle both object and JSON string values
      if (typeof wizardContext.value === "string") {
        try {
          ws = JSON.parse(wizardContext.value);
          console.log("[extractContextFromReadable] Parsed JSON string value");
        } catch {
          console.log("[extractContextFromReadable] Failed to parse value as JSON");
          return null;
        }
      } else if (typeof wizardContext.value === "object" && wizardContext.value !== null) {
        ws = wizardContext.value as Record<string, unknown>;
        console.log("[extractContextFromReadable] Using object value directly");
      } else {
        console.log("[extractContextFromReadable] Value is neither string nor object");
        return null;
      }

      console.log("[extractContextFromReadable] Extracted values:", {
        sourceName: ws.sourceName,
        sourceType: ws.sourceType,
        shipType: ws.shipType,
        setting: ws.setting,
        charactersCount: Array.isArray(ws.characters) ? ws.characters.length : 0,
        tagsCount: Array.isArray(ws.additionalTags) ? ws.additionalTags.length : 0,
      });

      return {
        sourceName: ws.sourceName as string | undefined,
        sourceType: ws.sourceType as string | undefined,
        shipType: ws.shipType as string | undefined,
        setting: ws.setting as string | undefined,
        characters: ws.characters ? (ws.characters as Array<{ name: string }>).map(c => c.name) : undefined,
        tags: ws.additionalTags as string[] | undefined,
        outline: ws.outline as string | undefined,
        researchData: ws.researchData as { mainCharacters: Array<{ name: string }>; popularShips: string[] } | undefined,
      };
    }
  }

  console.log("[extractContextFromReadable] Returning null - no context found");
  return null;
}

/**
 * Build the system prompt based on current state
 * Enhanced with strong anti-pattern instructions to prevent AI from ignoring context
 */
function buildSystemPrompt(state: FanficAgentState): string {
  // Try to get context from multiple sources
  const readableContext = extractContextFromReadable(state);
  const ws = state.wizardSession;
  const ctx = state.storyContext;

  // Determine the active context (prefer wizard session, fallback to readable, then story context)
  const sourceName = ws?.sourceName || readableContext?.sourceName || ctx?.fandom;
  const sourceType = ws?.sourceType || readableContext?.sourceType;
  const shipType = ws?.shipType || readableContext?.shipType;
  const setting = ws?.setting || readableContext?.setting || ctx?.setting;
  const characters = ws?.characters?.map(c => c.name) || readableContext?.characters || ctx?.characters?.map(c => c.name) || [];
  const tags = ws?.additionalTags || readableContext?.tags || ctx?.tags || [];
  const outline = ws?.outline || readableContext?.outline;
  const researchData = ws?.researchData || readableContext?.researchData;

  // Check if we have meaningful context
  const hasContext = sourceName || characters.length > 0;

  let prompt = `You are a creative fanfiction writing assistant.

## ABSOLUTE RULES - NEVER BREAK THESE

### Rule 1: NEVER ASK FOR INFORMATION ALREADY PROVIDED
The user has already specified their fandom, characters, and settings through the wizard.
${hasContext ? `Context is provided below - DO NOT ask for:
- The fandom/source material (already specified)
- Character names (already specified)
- Setting preferences (already specified)
- Ship/pairing preferences (already specified)
- Story tags (already specified)` : "If no context is provided, you may ask for details."}

### Rule 2: ALWAYS ADAPT USER REQUESTS TO FIT THE CONTEXT
When the user asks for any type of story, you MUST:
- Use ONLY the characters specified in the context below
- Adapt ANY genre/trope request to fit those specific characters
- Example: User says "write a gangster story" → Write gangster AU using the specified characters
- Example: User says "write a school romance" → Write school romance using the specified characters
- NEVER create new generic OC characters when characters are already specified

### Rule 3: USE THE PROVIDED CONTEXT IMMEDIATELY
When asked to write anything, START WRITING IMMEDIATELY using the context below.
- Do NOT confirm or ask "would you like me to..."
- Do NOT ask for clarification on characters or settings
- Do NOT request more details about the fandom
- JUST START CREATING using what you have`;

  // Add the active context with STRONG emphasis
  if (hasContext) {
    const characterList = characters.length > 0 ? characters.join(", ") : "Not specified";
    const exampleChars = characters.slice(0, 2).join(" and ") || "the specified characters";

    prompt += `

## YOUR MANDATORY CONTEXT (USE THIS NOW - DO NOT ASK FOR IT)

**FANDOM**: ${sourceName || "Not specified"} ${sourceType ? `(${sourceType})` : ""}
**CHARACTERS YOU MUST USE**: ${characterList}
**SHIP TYPE**: ${shipType?.toUpperCase() || "General"}
**SETTING**: ${setting || "Canon"}
**TAGS**: ${tags.length > 0 ? tags.join(", ") : "None"}
${researchData ? `**AVAILABLE CHARACTERS FROM RESEARCH**: ${researchData.mainCharacters.map(c => c.name).join(", ")}` : ""}
${researchData?.popularShips?.length ? `**POPULAR SHIPS**: ${researchData.popularShips.join(", ")}` : ""}
${outline ? `**EXISTING OUTLINE**: ${outline.slice(0, 500)}...` : ""}

### CORRECT BEHAVIOR EXAMPLE
User: "Write me a school romance"
You: "Perfect! Here's a school romance AU featuring ${exampleChars} from ${sourceName}..." (Then immediately start writing)

### INCORRECT BEHAVIOR EXAMPLE (NEVER DO THIS)
User: "Write me a school romance"
You: "I'd be happy to help! Which characters would you like to feature?" ← WRONG! Characters are specified above!
You: "Could you tell me more about the setting?" ← WRONG! Setting is specified above!
You: "What fandom is this for?" ← WRONG! Fandom is specified above!`;
  }

  prompt += `

## Your Personality
- Enthusiastic about fanfiction and fandom culture
- Expert at adapting different genres/tropes to any fandom
- Skilled at maintaining character voices across different AUs
- Creative in reinterpreting characters in new settings
- PROACTIVE - you start creating without asking unnecessary questions

## Guidelines
- ALWAYS use the provided fandom and characters without asking
- Adapt user requests to fit the specified context automatically
- Maintain consistent character personalities even in AU settings
- Use the specified ship type and tone
- When asked to write freely, use the provided context immediately`;

  // Add wizard step info if available
  if (ws?.step) {
    prompt += `

## Current Wizard Step: ${ws.step}`;

    if (ws.step === "outline") {
      prompt += `
You are helping create a story outline. The user has ALREADY provided:
- Fandom: ${sourceName || "specified above"}
- Characters: ${characters.join(", ") || "specified above"}

When the user requests ANY type of story or outline:
1. Use the generate_outline tool with the characters and fandom from the context
2. Do NOT ask what characters or fandom to use - they are ALREADY specified
3. Adapt the user's genre/trope request to fit the specified context
4. After generate_outline returns, you MUST call the present_outline action to show the outline to the user for approval
5. NEVER skip the present_outline step - the user must approve the outline before proceeding`;
    }
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
 * Note: Cache is now handled on Vercel side via /api/research-cache
 * - ResearchProgress component checks cache BEFORE triggering agent
 * - ResearchProgress saves results to cache AFTER agent completes
 * - This eliminates Prisma dependency on Railway
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

  // Start research (cache is checked by Vercel frontend before calling agent)

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

    // Mark this log as done
    logs[i].done = true;
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

  // Mark aggregation as done
  logs[logs.length - 1].done = true;
  // Note: Cache save is handled by Vercel frontend after receiving results

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
 * Inject context reminder into user messages to ensure AI doesn't ignore context
 * This is a defense-in-depth measure to reinforce context usage
 */
function injectContextReminder(
  state: FanficAgentState,
  userMessage: string
): string {
  const context = extractContextFromReadable(state);
  const ws = state.wizardSession;

  // Merge context sources
  const sourceName = ws?.sourceName || context?.sourceName;
  const characters = ws?.characters?.map(c => c.name) || context?.characters || [];

  // If no meaningful context, return message unchanged
  if (!sourceName || characters.length === 0) {
    return userMessage;
  }

  // Detect if this is a story creation request (patterns for both English and common creative requests)
  const storyPatterns = [
    /write|create|make|generate|outline|story|chapter|draft|plot/i,
    /help me|can you|please|i want|i'd like|let's/i,
  ];

  const isStoryRequest = storyPatterns.some(p => p.test(userMessage));

  if (isStoryRequest) {
    // Append system reminder to reinforce context usage
    return `${userMessage}

[SYSTEM REMINDER: User has already provided context through the wizard:
- Fandom: ${sourceName}
- Characters: ${characters.join(", ")}
Do NOT ask for this information again. Adapt the user's request to use these characters and fandom immediately.]`;
  }

  return userMessage;
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

  // Debug: Log CopilotKit context to see what's being received
  const copilotContext = state.copilotkit as { context?: unknown[]; actions?: unknown[] } | undefined;
  console.log("[FanFic Agent] CopilotKit context array length:", copilotContext?.context?.length || 0);
  console.log("[FanFic Agent] CopilotKit actions count:", copilotContext?.actions?.length || 0);

  // Debug: Log extracted readable context
  const readableContext = extractContextFromReadable(state);
  console.log("[FanFic Agent] Extracted readable context:", JSON.stringify(readableContext, null, 2));

  // Debug: Log wizard session
  console.log("[FanFic Agent] Wizard session:", JSON.stringify(state.wizardSession, null, 2));

  const model = new ChatOpenAI({
    temperature: 0.8,
    model: "gpt-4o-mini",  // Using mini for faster responses (fits within Vercel 60s timeout)
  });

  // Get frontend tools from CopilotKit
  const frontendTools = convertActionsToDynamicStructuredTools(
    state.copilotkit?.actions ?? []
  );

  // Debug: Log available frontend tools
  console.log("[FanFic Agent] Frontend tools available:", frontendTools.map(t => t.name));

  // Combine frontend and backend tools (research is handled separately)
  const allTools = [...frontendTools, ...allBackendTools];
  console.log("[FanFic Agent] All tools available:", allTools.map(t => t.name));

  // Bind tools to the model
  const modelWithTools = model.bindTools(allTools, { parallel_tool_calls: false });

  // Build context-aware system prompt
  const systemPrompt = buildSystemPrompt(state);

  // Debug: Log first 500 chars of system prompt
  console.log("[FanFic Agent] System prompt (first 500 chars):", systemPrompt.substring(0, 500));

  // Process messages - inject context reminder into the last user message if needed
  let processedMessages = [...state.messages];
  const lastMessage = state.messages[state.messages.length - 1];

  // Debug: Log last message type
  console.log("[FanFic Agent] Last message type:", lastMessage?._getType());

  // Process user messages - inject context reminder if needed
  if (lastMessage && lastMessage._getType() === "human") {
    const content = typeof lastMessage.content === "string" ? lastMessage.content : "";
    const enrichedContent = injectContextReminder(state, content);

    if (enrichedContent !== content) {
      console.log("[FanFic Agent] Injected context reminder into user message");
      // Replace the last message with the enriched version
      processedMessages = [
        ...state.messages.slice(0, -1),
        new HumanMessage(enrichedContent)
      ];
    }
  }

  // Emit state to frontend
  await copilotkitEmitState(config, state);

  // Invoke the model with processed messages
  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt), ...processedMessages],
    config
  );

  // Debug: Log response tool calls
  const aiResponse = response as AIMessage;
  console.log("[FanFic Agent] Response has tool_calls:", !!aiResponse.tool_calls?.length);
  if (aiResponse.tool_calls?.length) {
    console.log("[FanFic Agent] Response tool calls:", aiResponse.tool_calls.map(tc => tc.name));
  }

  return { messages: [response] };
}

/**
 * Tool node for backend tools (non-research)
 * For HITL tools like generate_outline, returns an AIMessage to avoid ToolMessage format issues
 */
async function toolNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  const customConfig = copilotkitCustomizeConfig(config, { emitMessages: true });

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];

  const resultMessages: (ToolMessage | AIMessage)[] = [];
  let pendingContent: { type: "outline" | "continuation" | "expansion" | "image"; content: string } | null = null;

  for (const toolCall of toolCalls) {
    const toolName = toolCall.name;

    if (regularToolNames.has(toolName)) {
      const tool = allBackendTools.find((t) => t.name === toolName);
      if (tool) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (tool as any).invoke(toolCall.args, customConfig);
          const resultContent = typeof result === "string" ? result : JSON.stringify(result);

          // For generate_outline, return an AIMessage with the outline directly
          // This avoids ToolMessage format issues with CopilotKit
          if (toolName === "generate_outline") {
            console.log("[FanFic Agent] generate_outline completed, returning AIMessage with outline");
            pendingContent = {
              type: "outline",
              content: resultContent,
            };
            // Return the outline as a user-friendly message
            resultMessages.push(new AIMessage({
              content: `## Story Outline\n\n${resultContent}\n\n---\n\n**Please review the outline above.** Let me know if you'd like to:\n- **Approve it** and start writing\n- **Modify it** with specific changes\n- **Regenerate** with different ideas`,
            }));
          } else {
            // For other tools, use standard ToolMessage
            resultMessages.push(new ToolMessage({
              content: resultContent,
              name: toolName,
              tool_call_id: toolCall.id!,
            }));
          }
        } catch (error) {
          console.error(`Tool ${toolName} error:`, error);
          resultMessages.push(new ToolMessage({
            content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            name: toolName,
            tool_call_id: toolCall.id!,
          }));
        }
      }
    }
  }

  // Emit state with pendingContent if set (for HITL)
  if (pendingContent) {
    console.log("[FanFic Agent] Emitting state with pendingContent for HITL approval");
    await copilotkitEmitState(config, {
      ...state,
      pendingContent,
    });
  }

  // Return state update
  const stateUpdate: Partial<FanficAgentState> = { messages: resultMessages };
  if (pendingContent) {
    stateUpdate.pendingContent = pendingContent;
  }

  return stateUpdate;
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
  console.log("[FanFic Agent] ========== ROUTE AFTER CHAT ==========");
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  console.log("[FanFic Agent] Last message type:", lastMessage._getType());
  console.log("[FanFic Agent] Has tool_calls:", !!lastMessage.tool_calls?.length);

  if (lastMessage.tool_calls?.length) {
    console.log("[FanFic Agent] Tool calls:", lastMessage.tool_calls.map(tc => tc.name));

    const hasBackendToolCall = lastMessage.tool_calls.some(
      (tc) => regularToolNames.has(tc.name)
    );
    const hasFrontendToolCall = lastMessage.tool_calls.some(
      (tc) => !regularToolNames.has(tc.name)
    );

    console.log("[FanFic Agent] Has backend tool call:", hasBackendToolCall);
    console.log("[FanFic Agent] Has frontend tool call:", hasFrontendToolCall);

    if (hasBackendToolCall) {
      console.log("[FanFic Agent] Routing to tool_node");
      return "tool_node";
    }

    // Frontend tools are handled by CopilotKit
    console.log("[FanFic Agent] Frontend tool call, routing to END (CopilotKit handles)");
    return END;
  }

  console.log("[FanFic Agent] No tool calls, routing to END");
  return END;
}

/**
 * Route after tool execution
 * All tools route to END - HITL is handled via state emission
 */
function routeAfterTool(state: FanficAgentState): string {
  // Find the AI message that triggered the tool call
  const aiMessageIndex = state.messages.length - 2;
  if (aiMessageIndex >= 0) {
    const prevAiMessage = state.messages[aiMessageIndex] as AIMessage;
    const toolCall = prevAiMessage?.tool_calls?.[0];

    if (toolCall) {
      console.log(`[FanFic Agent] Tool "${toolCall.name}" completed, routing to END`);
    }
  }

  // All tools route directly to END
  // HITL is handled by emitting pendingContent in toolNode, which frontend detects
  return END;
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
