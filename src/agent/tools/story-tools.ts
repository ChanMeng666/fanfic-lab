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
 */
export const generateOutlineTool = tool(
  async ({ fandom, ship, characters, plotIdeas, chapterCount }) => {
    const model = new ChatOpenAI({
      temperature: 0.9,
      model: "gpt-4o-mini",  // Using mini for faster responses (fits within Vercel 60s timeout)
    });

    const systemPrompt = `You are a creative fanfiction planner creating an engaging story outline.

## Guidelines
- Create compelling plot arcs
- Include character development moments
- Balance action, dialogue, and emotional beats
- Consider fandom-specific elements and canon
- Make sure romantic development feels earned (if applicable)
- Include conflict and resolution
- Plan cliffhangers between chapters (if multi-chapter)`;

    const prompt = `Create a ${chapterCount}-chapter story outline for:

Fandom: ${fandom}
Ship: ${ship || "No specific ship"}
Characters: ${characters.join(", ")}
Plot Ideas: ${plotIdeas.join(", ")}

Provide a chapter-by-chapter outline with:
- Chapter title
- Key events
- Character moments
- Emotional beats`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    return response.content as string;
  },
  {
    name: "generate_outline",
    description:
      "Generate a story outline from fandom, ship, characters, and plot ideas.",
    schema: z.object({
      fandom: z.string().describe("The fandom the story is set in"),
      ship: z.string().optional().describe("The romantic pairing if any"),
      characters: z
        .array(z.string())
        .describe("Names of main characters in the story"),
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
