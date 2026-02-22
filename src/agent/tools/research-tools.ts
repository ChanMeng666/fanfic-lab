/**
 * Research Tools for FanFic Lab Agent
 * Tavily-powered web search for source material research
 *
 * Used in chat_node for editor mode backward compat.
 * Pipeline research is handled by the dedicated research_node in agent.ts.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { tavily } from "@tavily/core";

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY || "" });

/**
 * Research Source Materials Tool
 * Searches the web for information about a fandom/source
 */
export const researchSourceTool = tool(
  async ({ sourceName, sourceType }): Promise<string> => {
    const searchQueries = [
      { focus: "characters", query: `${sourceName} main characters personality traits description wiki` },
      { focus: "plot", query: `${sourceName} plot summary story synopsis overview` },
      { focus: "world", query: `${sourceName} world setting lore background universe` },
      { focus: "ships", query: `${sourceName} popular ships pairings fanfiction relationships` },
    ];

    let toolMsg = `Researched "${sourceName}" (${sourceType}):\n`;
    let totalSources = 0;

    for (const sq of searchQueries) {
      try {
        const response = await tavilyClient.search(sq.query, {
          maxResults: 5,
          searchDepth: "basic",
        });

        const filtered = response.results.filter((r) => r.score > 0.4);
        totalSources += filtered.length;
        toolMsg += `\n- ${sq.focus}: Found ${filtered.length} sources`;
      } catch (error) {
        console.error(`Search error for ${sq.focus}:`, error);
        toolMsg += `\n- ${sq.focus}: Search failed`;
      }
    }

    return toolMsg + `\n\nResearch complete with ${totalSources} sources.`;
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
    }),
  }
);

/**
 * Quick Character Lookup Tool
 * Fast lookup for specific character information
 */
export const characterLookupTool = tool(
  async ({ sourceName, characterName }): Promise<string> => {
    try {
      const query = `${characterName} ${sourceName} character personality traits relationships wiki`;
      const response = await tavilyClient.search(query, {
        maxResults: 3,
        searchDepth: "basic",
      });

      const results = response.results.filter((r) => r.score > 0.4);
      const characterInfo = results.map((r) => r.content).join("\n\n");

      return `Found info about ${characterName}:\n${characterInfo || "No detailed info found."}`;
    } catch (error) {
      console.error("Character lookup error:", error);
      return `Character lookup failed for ${characterName}.`;
    }
  },
  {
    name: "character_lookup",
    description:
      "Quick lookup for specific character information from a fandom. Use when you need details about a particular character.",
    schema: z.object({
      sourceName: z.string().describe("Name of the source/fandom"),
      characterName: z.string().describe("Name of the character to look up"),
    }),
  }
);

// Export all research tools
export const researchTools = [researchSourceTool, characterLookupTool];
