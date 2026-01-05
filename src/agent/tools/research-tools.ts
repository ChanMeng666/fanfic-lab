/**
 * Research Tools for FanFic Lab Agent
 * Tavily-powered web search for source material research
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { SourceResearchData } from "../../lib/types/agent-state";

// Lazy initialization of Tavily to handle missing API key gracefully
let tavilySearch: { invoke: (params: { query: string }) => Promise<unknown> } | null = null;

async function getTavilySearch() {
  if (tavilySearch) return tavilySearch;

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not found, search will use fallback data");
    return null;
  }

  try {
    const { TavilySearch } = await import("@langchain/tavily");
    tavilySearch = new TavilySearch({
      maxResults: 5,
    });
    return tavilySearch;
  } catch (error) {
    console.error("Failed to initialize TavilySearch:", error);
    return null;
  }
}

// Fallback data for when Tavily is unavailable
function getFallbackCharacterData(sourceName: string): string {
  return JSON.stringify({
    results: [
      {
        title: `${sourceName} Characters`,
        content: `Main characters from ${sourceName}. Please refer to fan wikis for detailed information.`,
        url: "https://fandom.com",
      },
    ],
  });
}

function getFallbackPlotData(sourceName: string): string {
  return JSON.stringify({
    results: [
      {
        title: `${sourceName} Plot`,
        content: `The story of ${sourceName} follows the main characters through their journey.`,
        url: "https://wikipedia.org",
      },
    ],
  });
}

function getFallbackWorldData(sourceName: string): string {
  return JSON.stringify({
    results: [
      {
        title: `${sourceName} World`,
        content: `The world of ${sourceName} has its unique setting and atmosphere.`,
        url: "https://fandom.com",
      },
    ],
  });
}

function getFallbackShipData(sourceName: string): string {
  return JSON.stringify({
    results: [
      {
        title: `${sourceName} Ships`,
        content: `Popular pairings in the ${sourceName} fandom.`,
        url: "https://archiveofourown.org",
      },
    ],
  });
}

/**
 * Research Source Materials Tool
 * Searches the web for information about a fandom/source
 */
export const researchSourceTool = tool(
  async ({ sourceName, sourceType, searchFocus }): Promise<string> => {
    const queries: Record<string, string> = {
      characters: `${sourceName} main characters personality traits description wiki`,
      plot: `${sourceName} plot summary story synopsis overview`,
      world: `${sourceName} world setting lore background universe`,
      ships: `${sourceName} popular ships pairings fanfiction relationships`,
    };

    const searchQuery = queries[searchFocus] || `${sourceName} ${searchFocus}`;

    try {
      const tavily = await getTavilySearch();

      if (!tavily) {
        // Return fallback data when Tavily is not available
        console.log(`Using fallback data for ${searchFocus}`);
        switch (searchFocus) {
          case "characters":
            return getFallbackCharacterData(sourceName);
          case "plot":
            return getFallbackPlotData(sourceName);
          case "world":
            return getFallbackWorldData(sourceName);
          case "ships":
            return getFallbackShipData(sourceName);
          default:
            return JSON.stringify({ results: [], query: searchQuery });
        }
      }

      const results = await tavily.invoke({ query: searchQuery });
      return JSON.stringify(results, null, 2);
    } catch (error) {
      console.error("Tavily search error:", error);
      // Return structured error response instead of throwing
      return JSON.stringify({
        error: "Search failed",
        query: searchQuery,
        message: error instanceof Error ? error.message : "Unknown error",
        fallbackUsed: true,
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
  async ({ sourceName, sourceType, characterResults, plotResults, worldResults, shipResults }): Promise<string> => {
    try {
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
        originalPlot: `Information about ${sourceName} could not be fully processed. This is a ${sourceType} with rich storytelling.`,
        mainCharacters: [
          {
            name: "Main Character",
            description: `A central character in ${sourceName}`,
            traits: ["complex", "memorable"],
            relationships: [],
          },
        ],
        worldSettings: `The world of ${sourceName} - a ${sourceType} with its unique setting.`,
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
  async ({ sourceName, characterName }): Promise<string> => {
    const query = `${characterName} ${sourceName} character personality traits relationships wiki`;

    try {
      const tavily = await getTavilySearch();

      if (!tavily) {
        return JSON.stringify({
          character: characterName,
          source: sourceName,
          info: `${characterName} is a character from ${sourceName}.`,
          fallbackUsed: true,
        });
      }

      const results = await tavily.invoke({ query });
      return JSON.stringify(results, null, 2);
    } catch (error) {
      console.error("Character lookup error:", error);
      return JSON.stringify({
        error: "Character lookup failed",
        characterName,
        sourceName,
        message: error instanceof Error ? error.message : "Unknown error",
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
