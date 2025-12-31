/**
 * Image Tools for FanFic Lab Agent
 * AI image generation for character portraits and scene illustrations
 * Uses Google Gemini Imagen via Cloudinary
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { GeneratedImage, StoryCharacter } from "@/lib/types/agent-state";

/**
 * Generate Character Portrait Tool
 * Creates an AI-generated portrait for a character
 */
export const generateCharacterPortraitTool = tool(
  async ({ character, artStyle, mood }) => {
    // Build descriptive prompt for image generation
    const prompt = buildCharacterPrompt(character, artStyle, mood);

    // TODO: Implement actual image generation with Gemini Imagen + Cloudinary
    // For now, return a placeholder indicating the prompt that would be used
    const generatedImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      type: "character_portrait",
      url: "", // Will be filled by actual generation
      prompt,
    };

    return JSON.stringify({
      status: "prompt_ready",
      message:
        "Image generation will be implemented with Gemini Imagen integration",
      prompt,
      image: generatedImage,
    });
  },
  {
    name: "generate_character_portrait",
    description:
      "Generate an AI portrait for a character using their description and personality.",
    schema: z.object({
      character: z.object({
        name: z.string(),
        fandom: z.string(),
        personality: z.array(z.string()),
        portraitDescription: z
          .string()
          .optional()
          .describe("Physical description for the portrait"),
      }),
      artStyle: z
        .enum([
          "anime",
          "realistic",
          "digital_art",
          "painterly",
          "manga",
          "comic",
          "watercolor",
        ])
        .describe("Art style for the portrait"),
      mood: z
        .enum([
          "happy",
          "serious",
          "mysterious",
          "romantic",
          "action",
          "melancholy",
          "neutral",
        ])
        .describe("Mood/expression for the portrait"),
    }),
  }
);

/**
 * Generate Scene Illustration Tool
 * Creates an AI-generated illustration for a story scene
 */
export const generateSceneIllustrationTool = tool(
  async ({ sceneDescription, characters, artStyle, timeOfDay, atmosphere }) => {
    // Build descriptive prompt for scene
    const prompt = buildScenePrompt(
      sceneDescription,
      characters,
      artStyle,
      timeOfDay,
      atmosphere
    );

    // TODO: Implement actual image generation
    const generatedImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      type: "scene_illustration",
      url: "",
      prompt,
    };

    return JSON.stringify({
      status: "prompt_ready",
      message:
        "Image generation will be implemented with Gemini Imagen integration",
      prompt,
      image: generatedImage,
    });
  },
  {
    name: "generate_scene_illustration",
    description:
      "Generate an AI illustration for a story scene with characters and setting.",
    schema: z.object({
      sceneDescription: z
        .string()
        .describe("Description of what's happening in the scene"),
      characters: z
        .array(z.string())
        .describe("Names of characters in the scene"),
      artStyle: z
        .enum([
          "anime",
          "realistic",
          "digital_art",
          "painterly",
          "manga",
          "comic",
          "watercolor",
        ])
        .describe("Art style for the illustration"),
      timeOfDay: z
        .enum(["dawn", "morning", "afternoon", "evening", "night", "unspecified"])
        .describe("Time of day for lighting"),
      atmosphere: z
        .enum(["romantic", "tense", "peaceful", "dramatic", "mysterious", "joyful"])
        .describe("Overall atmosphere of the scene"),
    }),
  }
);

/**
 * Generate Story Cover Tool
 * Creates an AI-generated cover image for a story
 */
export const generateStoryCoverTool = tool(
  async ({ title, fandom, genre, mainCharacters, artStyle }) => {
    // Build cover prompt
    const prompt = buildCoverPrompt(
      title,
      fandom,
      genre,
      mainCharacters,
      artStyle
    );

    const generatedImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      type: "cover",
      url: "",
      prompt,
    };

    return JSON.stringify({
      status: "prompt_ready",
      message:
        "Image generation will be implemented with Gemini Imagen integration",
      prompt,
      image: generatedImage,
    });
  },
  {
    name: "generate_story_cover",
    description: "Generate an AI cover image for a fanfiction story.",
    schema: z.object({
      title: z.string().describe("Story title"),
      fandom: z.string().describe("The fandom the story is set in"),
      genre: z
        .enum([
          "romance",
          "action",
          "drama",
          "comedy",
          "mystery",
          "angst",
          "fluff",
          "horror",
        ])
        .describe("Main genre of the story"),
      mainCharacters: z
        .array(z.string())
        .describe("Main character names to feature"),
      artStyle: z
        .enum([
          "anime",
          "realistic",
          "digital_art",
          "painterly",
          "manga",
          "minimalist",
        ])
        .describe("Art style for the cover"),
    }),
  }
);

// Helper functions to build prompts

function buildCharacterPrompt(
  character: { name: string; fandom: string; personality: string[]; portraitDescription?: string },
  artStyle: string,
  mood: string
): string {
  const personalityDesc = character.personality.slice(0, 3).join(", ");

  return `${artStyle} style portrait of ${character.name} from ${character.fandom},
${character.portraitDescription || "detailed character portrait"},
expression showing ${mood} mood, personality: ${personalityDesc},
high quality, detailed face, professional illustration`;
}

function buildScenePrompt(
  description: string,
  characters: string[],
  artStyle: string,
  timeOfDay: string,
  atmosphere: string
): string {
  const characterList =
    characters.length > 0 ? `featuring ${characters.join(" and ")}` : "";

  return `${artStyle} style illustration, ${description}, ${characterList},
${timeOfDay !== "unspecified" ? `${timeOfDay} lighting,` : ""}
${atmosphere} atmosphere, detailed background, high quality fanfiction illustration`;
}

function buildCoverPrompt(
  title: string,
  fandom: string,
  genre: string,
  characters: string[],
  artStyle: string
): string {
  const characterList =
    characters.length > 0 ? `featuring ${characters.join(" and ")}` : "";

  return `Book cover art, ${artStyle} style, for "${title}",
${fandom} fanfiction, ${genre} genre, ${characterList},
dramatic composition, eye-catching, professional cover art quality,
vertical orientation, suitable for story thumbnail`;
}

// Export all image tools
export const imageTools = [
  generateCharacterPortraitTool,
  generateSceneIllustrationTool,
  generateStoryCoverTool,
];
