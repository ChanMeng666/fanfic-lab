/**
 * Story Tools for FanFic Lab Agent
 * AI-powered writing assistance tools
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { StoryContext } from "../../lib/types/agent-state";

/**
 * Continue Story Tool - "Magic Continue"
 * Generates the next segment of the story
 */
export const continueStoryTool = tool(
  async ({ storyContext, currentContent, targetLength }) => {
    const model = new ChatOpenAI({
      temperature: 0.85,
      model: "gpt-4o-mini",  // Using mini for faster responses (fits within Vercel 60s timeout)
    });

    const systemPrompt = `You are an expert fanfiction writer continuing a story.

## Story Context
- Fandom: ${storyContext.fandom}
- Ships: ${storyContext.ships.join(", ") || "None specified"}
- Tags: ${storyContext.tags.join(", ") || "None specified"}
- Tone: ${storyContext.tone}
- Characters: ${storyContext.characters.map((c) => `${c.name} (${c.personality.join(", ")})`).join("; ") || "None defined"}
${storyContext.plotPoints.length > 0 ? `- Key Plot Points: ${storyContext.plotPoints.join("; ")}` : ""}

## Guidelines
- Maintain consistent character voices
- Match the established tone and style
- Keep romantic pairings consistent with the specified ships
- Build on existing plot threads
- Use natural dialogue and descriptions
- Generate approximately ${targetLength === "short" ? "100-200" : targetLength === "medium" ? "300-500" : "500-800"} words`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Continue this story naturally:\n\n${currentContent}\n\n[Continue from here...]`
      ),
    ]);

    return response.content as string;
  },
  {
    name: "continue_story",
    description:
      "Generate the next segment of the story. Use this for 'Magic Continue' feature.",
    schema: z.object({
      storyContext: z.object({
        fandom: z.string(),
        ships: z.array(z.string()),
        tags: z.array(z.string()),
        tone: z.string(),
        plotPoints: z.array(z.string()),
        characters: z.array(
          z.object({
            name: z.string(),
            personality: z.array(z.string()),
          })
        ),
      }),
      currentContent: z
        .string()
        .describe("The current story content to continue from"),
      targetLength: z
        .enum(["short", "medium", "long"])
        .describe("Target length for the continuation"),
    }),
  }
);

/**
 * Expand Scene Tool
 * Expands a selected passage with more detail
 */
export const expandSceneTool = tool(
  async ({ storyContext, selectedText, expansionFocus }) => {
    const model = new ChatOpenAI({
      temperature: 0.8,
      model: "gpt-4o-mini",  // Using mini for faster responses (fits within Vercel 60s timeout)
    });

    const systemPrompt = `You are an expert fanfiction writer expanding a scene.

## Story Context
- Fandom: ${storyContext.fandom}
- Tone: ${storyContext.tone}
- Characters: ${storyContext.characters.map((c) => c.name).join(", ")}

## Expansion Focus: ${expansionFocus}

## Guidelines
- Maintain the same style and voice
- Add vivid sensory details
- Expand character emotions and reactions
- Keep consistent with established canon/fanon
- Make the expansion feel natural, not padded`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(
        `Expand this passage with more ${expansionFocus}:\n\n"${selectedText}"\n\nWrite an expanded version that flows naturally.`
      ),
    ]);

    return response.content as string;
  },
  {
    name: "expand_scene",
    description:
      "Expand a selected passage with more detail and description.",
    schema: z.object({
      storyContext: z.object({
        fandom: z.string(),
        tone: z.string(),
        characters: z.array(z.object({ name: z.string() })),
      }),
      selectedText: z.string().describe("The text passage to expand"),
      expansionFocus: z
        .enum([
          "dialogue",
          "description",
          "emotion",
          "action",
          "atmosphere",
          "general",
        ])
        .describe("What aspect to focus the expansion on"),
    }),
  }
);

/**
 * Polish Prose Tool
 * Improves the writing quality of selected text
 */
export const polishProseTool = tool(
  async ({ selectedText, polishLevel, storyTone }) => {
    const model = new ChatOpenAI({
      temperature: 0.6,
      model: "gpt-4o-mini",  // Using mini for faster responses (fits within Vercel 60s timeout)
    });

    const instructions =
      polishLevel === "light"
        ? "Make minimal improvements to grammar and flow while preserving the author's voice"
        : polishLevel === "medium"
          ? "Improve prose quality, enhance descriptions, and smooth awkward phrasing"
          : "Significantly enhance the writing with more vivid language, better pacing, and stronger imagery";

    const systemPrompt = `You are an expert editor polishing fanfiction prose.

## Instructions
${instructions}

## Story Tone: ${storyTone}

## Guidelines
- Preserve the author's unique voice and style
- Maintain character voices in dialogue
- Keep the same meaning and plot points
- Enhance readability without over-writing
- Return only the polished text, no explanations`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Polish this passage:\n\n${selectedText}`),
    ]);

    return response.content as string;
  },
  {
    name: "polish_prose",
    description: "Improve the writing quality of selected text.",
    schema: z.object({
      selectedText: z.string().describe("The text to polish"),
      polishLevel: z
        .enum(["light", "medium", "heavy"])
        .describe("How much to polish the prose"),
      storyTone: z.string().describe("The overall tone of the story"),
    }),
  }
);

/**
 * Generate Outline Tool
 * Creates a story outline from basic parameters
 * Enhanced with strong character enforcement
 */
export const generateOutlineTool = tool(
  async ({ fandom, ship, characters, plotIdeas, chapterCount }) => {
    const model = new ChatOpenAI({
      temperature: 0.9,
      model: "gpt-4o-mini",  // Using mini for faster responses (fits within Vercel 60s timeout)
    });

    const characterList = characters.join(", ");
    const exampleChars = characters.slice(0, 2).join(" and ");

    const systemPrompt = `You are a creative fanfiction planner for "${fandom}".

## ABSOLUTE REQUIREMENTS - NEVER BREAK THESE

1. **USE ONLY THESE CHARACTERS**: ${characterList}
2. **DO NOT CREATE NEW CHARACTERS** - No OCs, no generic characters, only the ones listed
3. **EVERY CHAPTER** must feature at least one character from the list
4. **ALL INTERACTIONS** must be between the specified characters

## CHARACTER LIST (USE ONLY THESE)
${characters.map((c, i) => `${i + 1}. ${c}`).join("\n")}

${ship ? `## MAIN PAIRING\n${ship}\nThe romantic development between these characters is central to the story.` : ""}

## GUIDELINES FOR "${fandom}"
- Reference canon events, locations, and lore from "${fandom}"
- Keep character voices authentic to their original portrayal
- Adapt canon personalities to the requested genre/setting
- Create compelling arcs highlighting relationships between ${exampleChars}
- Include character development moments true to their personalities
- Balance action, dialogue, and emotional beats
- Make romantic development feel earned (if applicable)
- Plan engaging chapter endings`;

    const prompt = `Create a ${chapterCount}-chapter story outline for a "${fandom}" fanfiction.

## MANDATORY CHARACTER LIST (use ONLY these)
${characters.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## STORY ELEMENTS
- **Main Ship/Pairing**: ${ship || "General (focus on friendship/adventure)"}
- **Plot Ideas**: ${plotIdeas.join(", ")}

## OUTPUT FORMAT
For each chapter, provide:
1. **Chapter Title** - A compelling title
2. **Key Events** - What happens (featuring ONLY the listed characters)
3. **Character Focus** - Which character(s) from the list are featured
4. **Emotional Arc** - The emotional journey in this chapter

CRITICAL: Do NOT introduce any characters not in the list above. All scenes must feature ${characterList}.`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    return response.content as string;
  },
  {
    name: "generate_outline",
    description:
      "Generate a story outline from fandom, ship, characters, and plot ideas. ALWAYS use the characters provided - never create new ones.",
    schema: z.object({
      fandom: z.string().describe("The fandom the story is set in"),
      ship: z.string().optional().describe("The romantic pairing if any"),
      characters: z
        .array(z.string())
        .describe("Names of main characters in the story - use ONLY these characters"),
      plotIdeas: z
        .array(z.string())
        .describe("Key plot points or ideas to incorporate"),
      chapterCount: z
        .number()
        .min(1)
        .max(20)
        .describe("Number of chapters to outline"),
    }),
  }
);

// Export all story tools
export const storyTools = [
  continueStoryTool,
  expandSceneTool,
  polishProseTool,
  generateOutlineTool,
];
