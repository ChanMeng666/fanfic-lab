/**
 * Image Tools for FanFic Lab Agent
 * AI image generation for character portraits and scene illustrations
 * Uses Google Gemini Imagen via Cloudinary
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { GeneratedImage } from "@/lib/types/agent-state";

// Gemini API configuration
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002";

interface GeminiImageResponse {
  predictions?: Array<{
    bytesBase64Encoded: string;
    mimeType: string;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

/**
 * Generate an image using Google Gemini Imagen API
 */
async function generateImageWithGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.warn("GOOGLE_API_KEY not configured - image generation disabled");
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:predict?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "block_some",
            personGeneration: "allow_adult",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return null;
    }

    const data: GeminiImageResponse = await response.json();

    if (data.error) {
      console.error("Gemini API error:", data.error.message);
      return null;
    }

    if (data.predictions?.[0]?.bytesBase64Encoded) {
      return `data:${data.predictions[0].mimeType || "image/png"};base64,${data.predictions[0].bytesBase64Encoded}`;
    }

    return null;
  } catch (error) {
    console.error("Failed to generate image with Gemini:", error);
    return null;
  }
}

/**
 * Upload image to Cloudinary (if configured)
 */
async function uploadToCloudinary(
  base64Image: string,
  folder: string
): Promise<{ url: string; publicId: string } | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("Cloudinary not configured - returning base64 image");
    return null;
  }

  try {
    // Dynamic import to avoid issues when cloudinary isn't installed
    const { uploadImage } = await import("@/lib/cloudinary");
    const result = await uploadImage(base64Image, {
      type: folder as "portrait" | "cover" | "illustration",
    });
    return { url: result.url, publicId: result.publicId };
  } catch (error) {
    console.error("Failed to upload to Cloudinary:", error);
    return null;
  }
}

/**
 * Generate Character Portrait Tool
 * Creates an AI-generated portrait for a character
 */
export const generateCharacterPortraitTool = tool(
  async ({ character, artStyle, mood }) => {
    // Build descriptive prompt for image generation
    const prompt = buildCharacterPrompt(character, artStyle, mood);

    // Generate image with Gemini
    const base64Image = await generateImageWithGemini(prompt);

    let imageUrl = "";
    let publicId = "";

    if (base64Image) {
      // Try to upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(base64Image, "portrait");
      if (cloudinaryResult) {
        imageUrl = cloudinaryResult.url;
        publicId = cloudinaryResult.publicId;
      } else {
        // Fallback to base64 URL (not recommended for production)
        imageUrl = base64Image;
      }
    }

    const generatedImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      type: "character_portrait",
      url: imageUrl,
      prompt,
    };

    if (!base64Image) {
      return JSON.stringify({
        status: "pending_approval",
        message: "Image generation requires API configuration. Please review the prompt and approve to continue.",
        prompt,
        image: generatedImage,
        requiresApproval: true,
      });
    }

    return JSON.stringify({
      status: "success",
      message: `Portrait generated for ${character.name}`,
      prompt,
      image: generatedImage,
      publicId,
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

    // Generate image with Gemini
    const base64Image = await generateImageWithGemini(prompt);

    let imageUrl = "";
    let publicId = "";

    if (base64Image) {
      const cloudinaryResult = await uploadToCloudinary(base64Image, "illustration");
      if (cloudinaryResult) {
        imageUrl = cloudinaryResult.url;
        publicId = cloudinaryResult.publicId;
      } else {
        imageUrl = base64Image;
      }
    }

    const generatedImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      type: "scene_illustration",
      url: imageUrl,
      prompt,
    };

    if (!base64Image) {
      return JSON.stringify({
        status: "pending_approval",
        message: "Image generation requires API configuration. Please review the prompt.",
        prompt,
        image: generatedImage,
        requiresApproval: true,
      });
    }

    return JSON.stringify({
      status: "success",
      message: "Scene illustration generated successfully",
      prompt,
      image: generatedImage,
      publicId,
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

    // Generate image with Gemini
    const base64Image = await generateImageWithGemini(prompt);

    let imageUrl = "";
    let publicId = "";

    if (base64Image) {
      const cloudinaryResult = await uploadToCloudinary(base64Image, "cover");
      if (cloudinaryResult) {
        imageUrl = cloudinaryResult.url;
        publicId = cloudinaryResult.publicId;
      } else {
        imageUrl = base64Image;
      }
    }

    const generatedImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      type: "cover",
      url: imageUrl,
      prompt,
    };

    if (!base64Image) {
      return JSON.stringify({
        status: "pending_approval",
        message: "Image generation requires API configuration. Please review the prompt.",
        prompt,
        image: generatedImage,
        requiresApproval: true,
      });
    }

    return JSON.stringify({
      status: "success",
      message: `Cover generated for "${title}"`,
      prompt,
      image: generatedImage,
      publicId,
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
