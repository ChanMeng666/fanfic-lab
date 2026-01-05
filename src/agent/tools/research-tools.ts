/**
 * Research Tools for FanFic Lab Agent
 * Tavily-powered web search for source material research
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TavilySearch } from "@langchain/tavily";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { SourceResearchData, ResearchCharacter } from "../../lib/types/agent-state";

// Initialize Tavily search (will use TAVILY_API_KEY env var)
const tavilySearch = new TavilySearch({
  maxResults: 5,
});

/**
 * Research Source Materials Tool
 * Searches the web for information about a fandom/source
 */
export const researchSourceTool = tool(
  async ({ sourceName, sourceType, searchFocus }) => {
    const queries: Record<string, string> = {
      characters: `${sourceName} main characters personality traits description wiki`,
      plot: `${sourceName} plot summary story synopsis overview`,
      world: `${sourceName} world setting lore background universe`,
      ships: `${sourceName} popular ships pairings fanfiction relationships`,
    };

    const searchQuery = queries[searchFocus] || `${sourceName} ${searchFocus}`;

    try {
      const results = await tavilySearch.invoke({ query: searchQuery });
      return JSON.stringify(results, null, 2);
    } catch (error) {
      console.error("Tavily search error:", error);
      return JSON.stringify({
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
  {
    name: "research_source_materials",
    description:
      "Search the web for information about a fandom/source including characters, plot, world settings, and popular ships. Use this when the user selects a source and needs background information.",
    schema: z.object({
      sourceName: z
        .string()
        .describe("Name of the source (e.g., 'Genshin Impact', 'Attack on Titan')"),
      sourceType: z
        .enum(["anime", "manga", "game", "novel", "tv", "movie", "kpop", "other"])
        .describe("Type of source media"),
      searchFocus: z
        .enum(["characters", "plot", "world", "ships"])
        .describe("What aspect to focus the search on"),
    }),
  }
);

/**
 * Aggregate Research Results Tool
 * Combines and structures multiple research results into usable data
 */
export const aggregateResearchTool = tool(
  async ({ sourceName, sourceType, characterResults, plotResults, worldResults, shipResults }) => {
    const model = new ChatOpenAI({
      temperature: 0.3,
      model: "gpt-4o",
    });

    const systemPrompt = `You are a fandom research assistant. Your job is to aggregate web search results into a structured format for fanfiction writing.

You MUST return a valid JSON object with this exact structure:
{
  "originalPlot": "string - 2-3 paragraph summary of the original story",
  "mainCharacters": [
    {
      "name": "string - character name",
      "description": "string - brief description",
      "traits": ["array", "of", "personality", "traits"],
      "relationships": ["array", "of", "key", "relationships"]
    }
  ],
  "worldSettings": "string - description of the world/setting",
  "popularShips": ["array", "of", "popular", "ship", "names"],
  "canonRelationships": ["array", "of", "canon", "relationships"],
  "searchSources": ["array", "of", "source", "urls"]
}

Focus on extracting:
- Key characters with their defining traits
- The main plot without spoilers for ongoing series
- World-building details useful for fanfiction
- Popular fan pairings/ships
- Canon relationships between characters`;

    const userPrompt = `Aggregate the following research about "${sourceName}" (${sourceType}) into the JSON format:

## Character Research:
${characterResults}

## Plot Research:
${plotResults}

## World/Setting Research:
${worldResults}

## Ship/Pairing Research:
${shipResults}

Return ONLY the JSON object, no other text.`;

    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      const content = response.content as string;

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Validate it's proper JSON
        const parsed = JSON.parse(jsonMatch[0]) as SourceResearchData;
        return JSON.stringify(parsed, null, 2);
      }

      return content;
    } catch (error) {
      console.error("Aggregation error:", error);
      // Return a default structure if parsing fails
      const defaultData: SourceResearchData = {
        originalPlot: `Information about ${sourceName} could not be fully processed.`,
        mainCharacters: [],
        worldSettings: "",
        popularShips: [],
        canonRelationships: [],
        searchSources: [],
      };
      return JSON.stringify(defaultData, null, 2);
    }
  },
  {
    name: "aggregate_research",
    description:
      "Aggregate and structure multiple research results into a unified format for fanfiction writing. Call this after gathering all search results.",
    schema: z.object({
      sourceName: z.string().describe("Name of the source being researched"),
      sourceType: z
        .enum(["anime", "manga", "game", "novel", "tv", "movie", "kpop", "other"])
        .describe("Type of source media"),
      characterResults: z.string().describe("Results from character search"),
      plotResults: z.string().describe("Results from plot search"),
      worldResults: z.string().describe("Results from world/setting search"),
      shipResults: z.string().describe("Results from ship/pairing search"),
    }),
  }
);

/**
 * Quick Character Lookup Tool
 * Fast lookup for specific character information
 */
export const characterLookupTool = tool(
  async ({ sourceName, characterName }) => {
    const query = `${characterName} ${sourceName} character personality traits relationships wiki`;

    try {
      const results = await tavilySearch.invoke({ query });
      return JSON.stringify(results, null, 2);
    } catch (error) {
      console.error("Character lookup error:", error);
      return JSON.stringify({
        error: "Character lookup failed",
        characterName,
        sourceName,
      });
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
export const researchTools = [
  researchSourceTool,
  aggregateResearchTool,
  characterLookupTool,
];
