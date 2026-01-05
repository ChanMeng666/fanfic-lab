/**
 * Research Tools for FanFic Lab Agent
 * Tavily-powered web search for source material research
 *
 * Pattern based on open-research-ANA example:
 * - Uses @tavily/core directly (not LangChain wrapper)
 * - Tools accept state and update state.logs for progress
 * - Uses copilotkitEmitState to push real-time updates
 * - Returns updated state for frontend sync
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";
import { copilotkitEmitState } from "@copilotkit/sdk-js/langgraph";
import { tavily } from "@tavily/core";
import type { FanficAgentState, AgentLog } from "../state";
import type { SourceResearchData } from "../../lib/types/agent-state";

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

/**
 * Research Source Materials Tool
 * Searches the web for information about a fandom/source
 * Following the pattern from open-research-ANA
 */
export const researchSourceTool = tool(
  async (
    { sourceName, sourceType, state },
    config
  ): Promise<{ state: Partial<FanficAgentState>; message: string }> => {
    const logs: AgentLog[] = state?.logs || [];
    const sources: Record<string, { title: string; content: string; url: string; score?: number }> =
      state?.sources || {};

    // Define search queries for each aspect
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
    const runnableConfig = config as RunnableConfig;
    await copilotkitEmitState(runnableConfig, { logs, sources });

    let allResults: Array<{ title: string; content: string; url: string; score: number }> = [];
    let toolMsg = `Researched "${sourceName}" (${sourceType}):\n`;

    // Run searches sequentially and update progress
    for (let i = 0; i < searchQueries.length; i++) {
      const sq = searchQueries[i];

      try {
        const response = await tavilyClient.search(sq.query, {
          maxResults: 5,
          searchDepth: "basic",
        });

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

        toolMsg += `\n- ${sq.focus}: Found ${filteredResults.length} sources`;
      } catch (error) {
        console.error(`Search error for ${sq.focus}:`, error);
        toolMsg += `\n- ${sq.focus}: Search failed`;
      }

      // Mark this log as done
      logs[i].done = true;
      await copilotkitEmitState(runnableConfig, { logs, sources });
    }

    // Add aggregation log
    logs.push({
      message: "✨ Compiling research results...",
      done: false,
    });
    await copilotkitEmitState(runnableConfig, { logs, sources });

    // Aggregate results into structured format
    const researchData = await aggregateResults(sourceName, sourceType, allResults);

    // Mark aggregation as done
    logs[logs.length - 1].done = true;
    await copilotkitEmitState(runnableConfig, { logs, sources });

    return {
      state: {
        logs,
        sources,
        wizardSession: state?.wizardSession ? {
          ...state.wizardSession,
          researchData,
        } : null,
      },
      message: toolMsg + `\n\nResearch complete with ${Object.keys(sources).length} sources.`,
    };
  },
  {
    name: "research_source_materials",
    description:
      "Search the web for comprehensive information about a fandom/source including characters, plot, world settings, and popular ships. Use this when researching a source for fanfiction writing.",
    schema: z.object({
      sourceName: z
        .string()
        .describe("Name of the source (e.g., 'Genshin Impact', 'Attack on Titan')"),
      sourceType: z
        .enum(["anime", "manga", "game", "novel", "tv", "movie", "kpop", "other"])
        .describe("Type of source media"),
      state: z
        .any()
        .optional()
        .describe("Current agent state (injected by tool node)"),
    }),
  }
);

/**
 * Aggregate search results into structured SourceResearchData
 */
async function aggregateResults(
  sourceName: string,
  sourceType: string,
  results: Array<{ title: string; content: string; url: string; score: number }>
): Promise<SourceResearchData> {
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
  const researchData: SourceResearchData = {
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

  return researchData;
}

/**
 * Quick Character Lookup Tool
 * Fast lookup for specific character information
 */
export const characterLookupTool = tool(
  async (
    { sourceName, characterName, state },
    config
  ): Promise<{ state: Partial<FanficAgentState>; message: string }> => {
    const logs: AgentLog[] = state?.logs || [];
    const sources: Record<string, { title: string; content: string; url: string; score?: number }> =
      state?.sources || {};

    logs.push({
      message: `🔍 Looking up: ${characterName} from ${sourceName}`,
      done: false,
    });

    const runnableConfig = config as RunnableConfig;
    await copilotkitEmitState(runnableConfig, { logs, sources });

    try {
      const query = `${characterName} ${sourceName} character personality traits relationships wiki`;
      const response = await tavilyClient.search(query, {
        maxResults: 3,
        searchDepth: "basic",
      });

      const results = response.results.filter((r) => r.score > 0.4);

      for (const result of results) {
        if (!sources[result.url]) {
          sources[result.url] = {
            title: result.title,
            content: result.content,
            url: result.url,
            score: result.score,
          };
        }
      }

      logs[logs.length - 1].done = true;
      await copilotkitEmitState(runnableConfig, { logs, sources });

      const characterInfo = results
        .map((r) => r.content)
        .join("\n\n");

      return {
        state: { logs, sources },
        message: `Found info about ${characterName}:\n${characterInfo || "No detailed info found."}`,
      };
    } catch (error) {
      console.error("Character lookup error:", error);
      logs[logs.length - 1].done = true;
      await copilotkitEmitState(runnableConfig, { logs, sources });

      return {
        state: { logs, sources },
        message: `Character lookup failed for ${characterName}.`,
      };
    }
  },
  {
    name: "character_lookup",
    description:
      "Quick lookup for specific character information from a fandom. Use when you need details about a particular character.",
    schema: z.object({
      sourceName: z.string().describe("Name of the source/fandom"),
      characterName: z.string().describe("Name of the character to look up"),
      state: z.any().optional().describe("Current agent state (injected by tool node)"),
    }),
  }
);

// Export all research tools
export const researchTools = [researchSourceTool, characterLookupTool];
