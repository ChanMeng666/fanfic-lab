/**
 * FanFic Lab LangGraph Agent
 * 7-node automated story generation pipeline + editor chat backward compat
 *
 * Pipeline: START -> route -> intake -> research -> planning -> [interrupt] -> writing -> polish -> delivery -> END
 * Chat:    START -> route -> chat_node -> tool_node -> chat_node -> END
 */

import { StateGraph, START, END, MemorySaver, interrupt } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tavily } from "@tavily/core";

import { FanficAgentStateAnnotation, FanficAgentState, AgentLog } from "./state";
import { allBackendTools } from "./tools";
import {
  INTAKE_PROMPT,
  RESEARCH_SUMMARY_PROMPT,
  PLANNING_PROMPT,
  WRITING_PROMPT,
  POLISH_PROMPT,
  DELIVERY_PROMPT,
} from "./prompts";
import type { SourceResearchData, StoryRequest, WritingPlan, StoryDeliverable } from "../lib/types/agent-state";

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

// Backend tool names for routing
const regularToolNames = new Set(allBackendTools.map((t) => t.name));

// ============================================
// Shared Helpers
// ============================================

/** Detect if text contains Chinese characters */
function isChineseInput(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

/** Parse JSON from LLM response (handles markdown code blocks) */
function parseJsonResponse(text: string): unknown {
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  return JSON.parse(jsonStr);
}

// ============================================
// Pipeline Node: Intake
// ============================================

async function intakeNode(
  state: FanficAgentState,
  _config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Pipeline] ========== INTAKE NODE ==========");

  const lastMessage = state.messages[state.messages.length - 1];
  const content = typeof lastMessage?.content === "string"
    ? lastMessage.content.replace("##PIPELINE##", "").trim()
    : "";

  console.log("[Pipeline] Parsing request:", content.substring(0, 200));

  const model = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" });

  const response = await model.invoke([
    new SystemMessage(INTAKE_PROMPT),
    new HumanMessage(content),
  ]);

  const responseText = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonResponse(responseText) as Record<string, unknown>;
  } catch {
    console.error("[Pipeline] Failed to parse intake response, using defaults");
    parsed = { fandom: content.split(" ").slice(0, 3).join(" "), detectedLanguage: "en" };
  }

  const storyRequest: StoryRequest = {
    fandom: (parsed.fandom as string) || content,
    cp: [],
    theme: "",
    setting: "",
    constraints: {
      length: "medium",
      rating: "T",
      ending: "happy",
      pov: "third",
      language: ((parsed.detectedLanguage as string) || (isChineseInput(content) ? "zh" : "en")) as "en" | "zh",
    },
  };

  console.log("[Pipeline] Intake complete:", storyRequest.fandom);

  return {
    pipelineStage: "research",
    storyRequest,
  };
}

// ============================================
// Pipeline Node: Research
// ============================================

async function researchNode(
  state: FanficAgentState,
  _config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Pipeline] ========== RESEARCH NODE ==========");

  const fandom = state.storyRequest?.fandom || "Unknown";
  const logs: AgentLog[] = [];
  const sources: Record<string, { title: string; content: string; url: string; score?: number }> = {};

  // Define 4 parallel search queries
  const searchQueries = [
    { focus: "characters", query: `${fandom} main characters personality traits description wiki` },
    { focus: "plot", query: `${fandom} plot summary story synopsis overview` },
    { focus: "world", query: `${fandom} world setting lore background universe` },
    { focus: "ships", query: `${fandom} popular ships pairings fanfiction relationships` },
  ];

  for (const sq of searchQueries) {
    logs.push({ message: `Searching: ${sq.focus} for "${fandom}"`, done: false });
  }

  // Run all 4 searches IN PARALLEL
  console.log("[Pipeline] Starting 4 parallel Tavily searches...");
  const searchResults = await Promise.all(
    searchQueries.map(async (sq, i) => {
      try {
        const response = await tavilyClient.search(sq.query, {
          maxResults: 5,
          searchDepth: "basic",
        });
        const filtered = response.results
          .filter((r) => r.score > 0.4)
          .map((r) => ({ title: r.title, content: r.content, url: r.url, score: r.score }));
        console.log(`[Pipeline] Search ${sq.focus}: ${filtered.length} results`);
        logs[i].done = true;
        return filtered;
      } catch (error) {
        console.error(`[Pipeline] Search error for ${sq.focus}:`, error);
        logs[i].done = true;
        return [];
      }
    })
  );

  // Flatten results and build sources map
  const allResults = searchResults.flat();
  for (const result of allResults) {
    if (!sources[result.url]) {
      sources[result.url] = result;
    }
  }

  // Summarize with LLM
  console.log("[Pipeline] Summarizing research with LLM...");
  logs.push({ message: "AI is summarizing research results...", done: false });

  const researchData = await aggregateSearchResultsWithLLM(fandom, "fandom", allResults);
  logs[logs.length - 1].done = true;

  console.log("[Pipeline] Research complete:", {
    characters: researchData.mainCharacters.length,
    sources: Object.keys(sources).length,
  });

  // Update wizard session for backward compat
  const updatedWizardSession = state.wizardSession
    ? { ...state.wizardSession, researchData }
    : null;

  return {
    pipelineStage: "planning",
    sources,
    logs,
    wizardSession: updatedWizardSession,
  };
}

/**
 * Aggregate search results into structured SourceResearchData using LLM
 */
async function aggregateSearchResultsWithLLM(
  sourceName: string,
  sourceType: string,
  results: Array<{ title: string; content: string; url: string; score: number }>
): Promise<SourceResearchData> {
  const combinedContent = results
    .map((r) => `### ${r.title}\n${r.content}`)
    .join("\n\n---\n\n");

  const summarizer = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" });
  const prompt = RESEARCH_SUMMARY_PROMPT(sourceName, sourceType);

  try {
    const response = await summarizer.invoke([
      new SystemMessage("You are a helpful assistant that extracts and summarizes information about fictional works for fanfiction writers. Always respond with valid JSON only."),
      new HumanMessage(`${prompt}\n\n## Search Results:\n${combinedContent.slice(0, 12000)}`),
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    const parsed = parseJsonResponse(responseText) as Record<string, unknown>;

    return {
      originalPlot: (parsed.plotSummary as string) || `${sourceName} is a ${sourceType} with a rich narrative.`,
      mainCharacters: ((parsed.characters as Array<{
        name: string; description?: string; traits?: string[]; relationships?: string[];
      }>) || []).slice(0, 10).map((char) => ({
        name: char.name,
        description: char.description || `A character from ${sourceName}`,
        traits: char.traits || ["complex", "memorable"],
        relationships: char.relationships || [],
      })),
      worldSettings: (parsed.worldSettings as string) || `The world of ${sourceName}.`,
      popularShips: (parsed.popularShips as string[]) || [],
      canonRelationships: (parsed.canonRelationships as string[]) || [],
      searchSources: results.slice(0, 5).map((r) => r.url),
    };
  } catch (error) {
    console.error("[Pipeline] LLM aggregation failed:", error);
    // Fallback
    return {
      originalPlot: `${sourceName} is a ${sourceType} with a rich narrative.`,
      mainCharacters: [],
      worldSettings: `The world of ${sourceName}.`,
      popularShips: [],
      canonRelationships: [],
      searchSources: results.slice(0, 5).map((r) => r.url),
    };
  }
}

// ============================================
// Pipeline Node: Planning (with HITL interrupt)
// ============================================

async function planningNode(
  state: FanficAgentState,
  _config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Pipeline] ========== PLANNING NODE ==========");

  const req = state.storyRequest;
  const isZh = req?.constraints?.language === "zh";

  const model = new ChatOpenAI({ temperature: 0.8, model: "gpt-4o" });

  const contextParts = [
    `Fandom: ${req?.fandom || "Unknown"}`,
    req?.cp?.length ? `Pairing: ${req.cp.join(", ")}` : "",
    req?.theme ? `Theme: ${req.theme}` : "",
    req?.setting ? `Setting: ${req.setting}` : "",
    req?.constraints ? `Length: ${req.constraints.length}, Rating: ${req.constraints.rating}, Ending: ${req.constraints.ending}, POV: ${req.constraints.pov}` : "",
  ].filter(Boolean).join("\n");

  const response = await model.invoke([
    new SystemMessage(PLANNING_PROMPT(isZh)),
    new HumanMessage(`Create a writing plan for:\n${contextParts}`),
  ]);

  const responseText = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  let writingPlan: WritingPlan;
  try {
    writingPlan = parseJsonResponse(responseText) as WritingPlan;
  } catch {
    console.error("[Pipeline] Failed to parse planning response, using defaults");
    writingPlan = {
      title: `${req?.fandom || "Untitled"} Story`,
      elements: `${req?.cp?.join(", ") || "General"} | ${req?.theme || "Adventure"}`,
      emotionalArc: ["Setup", "Escalation", "Climax", "Resolution"],
      sceneOutline: ["Opening scene", "Rising action", "Key moment", "Climax", "Resolution"],
      constraints: [],
    };
  }

  console.log("[Pipeline] Plan generated:", writingPlan.title);

  // HITL interrupt - pause for user plan review
  interrupt("plan_review");

  return {
    pipelineStage: "writing",
    writingPlan,
  };
}

// ============================================
// Pipeline Node: Writing
// ============================================

async function writingNode(
  state: FanficAgentState,
  _config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Pipeline] ========== WRITING NODE ==========");

  const req = state.storyRequest;
  const plan = state.writingPlan;
  const isZh = req?.constraints?.language === "zh";

  const model = new ChatOpenAI({ temperature: 0.9, model: "gpt-4o" });

  const planText = plan
    ? `Title: ${plan.title}\nElements: ${plan.elements}\nEmotional Arc: ${plan.emotionalArc.join(" -> ")}\nScene Outline:\n${plan.sceneOutline.map((s, i) => `${i + 1}. ${s}`).join("\n")}\nConstraints: ${plan.constraints.join(", ")}`
    : "No plan provided - write freely.";

  const contextParts = [
    `Fandom: ${req?.fandom || "Unknown"}`,
    req?.cp?.length ? `Pairing: ${req.cp.join(", ")}` : "",
    req?.constraints ? `Target length: ${req.constraints.length} (~${req.constraints.length === "short" ? "1000" : req.constraints.length === "medium" ? "3000" : "6000"} words)` : "",
    `\nWriting Plan:\n${planText}`,
  ].filter(Boolean).join("\n");

  const response = await model.invoke([
    new SystemMessage(WRITING_PROMPT(isZh)),
    new HumanMessage(`Write the complete story:\n${contextParts}`),
  ]);

  const storyDraft = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  console.log("[Pipeline] Draft written, length:", storyDraft.length);

  return {
    pipelineStage: "polishing",
    storyDraft,
  };
}

// ============================================
// Pipeline Node: Polish
// ============================================

async function polishNode(
  state: FanficAgentState,
  _config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Pipeline] ========== POLISH NODE ==========");

  const req = state.storyRequest;
  const isZh = req?.constraints?.language === "zh";

  const model = new ChatOpenAI({ temperature: 0.4, model: "gpt-4o-mini" });

  const response = await model.invoke([
    new SystemMessage(POLISH_PROMPT(isZh)),
    new HumanMessage(`Polish this story draft:\n\n${state.storyDraft}`),
  ]);

  const polishedText = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  console.log("[Pipeline] Polish complete, length:", polishedText.length);

  return {
    pipelineStage: "delivery",
    storyDraft: polishedText,
  };
}

// ============================================
// Pipeline Node: Delivery
// ============================================

async function deliveryNode(
  state: FanficAgentState,
  _config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Pipeline] ========== DELIVERY NODE ==========");

  const req = state.storyRequest;
  const plan = state.writingPlan;
  const isZh = req?.constraints?.language === "zh";
  const startTime = Date.now();

  const model = new ChatOpenAI({ temperature: 0.6, model: "gpt-4o-mini" });

  // Generate continuation hooks
  const response = await model.invoke([
    new SystemMessage(DELIVERY_PROMPT(isZh)),
    new HumanMessage(`Generate continuation hooks for this story:\n\n${state.storyDraft.slice(0, 2000)}...\n\n(Story ends here)`),
  ]);

  const responseText = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  let continuationHooks: string[];
  try {
    continuationHooks = parseJsonResponse(responseText) as string[];
  } catch {
    continuationHooks = ["What happens next? The story continues..."];
  }

  // Count words
  const wordCount = state.storyDraft.split(/\s+/).filter(Boolean).length;

  const deliverable: StoryDeliverable = {
    title: plan?.title || `${req?.fandom || "Untitled"} Story`,
    elements: plan?.elements || "",
    writingPlan: plan
      ? `${plan.emotionalArc.join(" -> ")}\n\n${plan.sceneOutline.join("\n")}`
      : "",
    body: state.storyDraft,
    continuationHooks,
    metadata: {
      wordCount,
      rating: req?.constraints?.rating || "T",
      generationTimeMs: Date.now() - startTime,
    },
  };

  console.log("[Pipeline] Delivery complete:", {
    title: deliverable.title,
    wordCount,
    hooks: continuationHooks.length,
  });

  return {
    pipelineStage: "complete",
    deliverable,
  };
}

// ============================================
// Chat Node (Editor backward compat)
// ============================================

async function chatNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Chat] ========== CHAT NODE ==========");
  console.log("[Chat] Messages count:", state.messages?.length || 0);

  const model = new ChatOpenAI({ temperature: 0.8, model: "gpt-4o-mini" });

  // Bind backend tools for editor mode
  const modelWithTools = model.bindTools(allBackendTools, { parallel_tool_calls: false });

  const systemPrompt = `You are a creative fanfiction writing assistant.

## Your Personality
- Enthusiastic about fanfiction and fandom culture
- Expert at adapting different genres/tropes to any fandom
- Skilled at maintaining character voices across different AUs
- Creative in reinterpreting characters in new settings
- PROACTIVE - you start creating without asking unnecessary questions

## Guidelines
- Use provided context immediately without asking for clarification
- Maintain consistent character personalities
- Adapt user requests to fit the specified fandom context automatically
- When asked to write freely, start creating immediately`;

  const response = await modelWithTools.invoke(
    [new SystemMessage(systemPrompt), ...state.messages],
    config
  );

  return { messages: [response] };
}

// ============================================
// Tool Node (Editor backward compat)
// ============================================

async function toolNode(
  state: FanficAgentState,
  _config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  console.log("[Chat] ========== TOOL NODE ==========");

  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
  const toolCalls = lastMessage.tool_calls || [];
  const resultMessages: ToolMessage[] = [];

  for (const toolCall of toolCalls) {
    const tool = allBackendTools.find((t) => t.name === toolCall.name);
    if (tool) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (tool as any).invoke(toolCall.args);
        const resultContent = typeof result === "string" ? result : JSON.stringify(result);
        resultMessages.push(new ToolMessage({
          content: resultContent,
          name: toolCall.name,
          tool_call_id: toolCall.id!,
        }));
      } catch (error) {
        console.error(`[Chat] Tool ${toolCall.name} error:`, error);
        resultMessages.push(new ToolMessage({
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          name: toolCall.name,
          tool_call_id: toolCall.id!,
        }));
      }
    }
  }

  return { messages: resultMessages };
}

// ============================================
// Routing Functions
// ============================================

/** Route from START: pipeline if ##PIPELINE## marker, else chat */
function routeFromStart(state: FanficAgentState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const content = typeof lastMessage?.content === "string" ? lastMessage.content : "";

  if (content.includes("##PIPELINE##")) {
    console.log("[Route] -> intake_node (pipeline request)");
    return "intake_node";
  }

  console.log("[Route] -> chat_node (regular chat)");
  return "chat_node";
}

/** Route after chat: tool_calls -> tool_node, else END */
function routeAfterChat(state: FanficAgentState): string {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    const hasBackendCall = lastMessage.tool_calls.some((tc) => regularToolNames.has(tc.name));
    if (hasBackendCall) {
      console.log("[Route] chat -> tool_node");
      return "tool_node";
    }
  }

  console.log("[Route] chat -> END");
  return END;
}

// ============================================
// Build the Graph
// ============================================

const workflow = new StateGraph(FanficAgentStateAnnotation)
  // Pipeline nodes
  .addNode("intake_node", intakeNode)
  .addNode("research_node", researchNode)
  .addNode("planning_node", planningNode)
  .addNode("writing_node", writingNode)
  .addNode("polish_node", polishNode)
  .addNode("delivery_node", deliveryNode)
  // Chat nodes (backward compat)
  .addNode("chat_node", chatNode)
  .addNode("tool_node", toolNode)
  // Entry routing
  .addConditionalEdges(START, routeFromStart)
  // Pipeline linear flow: intake -> research -> planning -> writing -> polish -> delivery -> END
  .addEdge("intake_node", "research_node")
  .addEdge("research_node", "planning_node")
  .addEdge("planning_node", "writing_node")
  .addEdge("writing_node", "polish_node")
  .addEdge("polish_node", "delivery_node")
  .addEdge("delivery_node", END)
  // Chat flow: chat -> tool -> chat loop, or chat -> END
  .addConditionalEdges("chat_node", routeAfterChat)
  .addEdge("tool_node", "chat_node");

// Create memory saver for state persistence
const memory = new MemorySaver();

// Compile the graph with checkpointer
export const graph = workflow.compile({
  checkpointer: memory,
});

// Export for LangGraph CLI
export default graph;
