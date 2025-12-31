/**
 * Character Tools for FanFic Lab Agent
 * Character creation and OOC detection
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { StoryCharacter, OOCCheckResult } from "@/lib/types/agent-state";

/**
 * Create Character Tool
 * Generates a detailed character profile for canon or OC characters
 */
export const createCharacterTool = tool(
  async ({ name, fandom, isOriginal, baseDescription, role }) => {
    const model = new ChatOpenAI({
      temperature: 0.8,
      model: "gpt-4o",
    });

    const systemPrompt = isOriginal
      ? `You are a creative character designer helping create an original character (OC) for fanfiction.

## Guidelines for OCs
- Create a unique, well-rounded character
- Avoid Mary Sue/Gary Stu traits
- Include relatable flaws and growth potential
- Consider how they fit into the fandom's world
- Make them interesting without overshadowing canon characters`
      : `You are a fandom expert helping define a canon character for fanfiction.

## Guidelines for Canon Characters
- Stay true to established characterization
- Include key personality traits and quirks
- Note important relationships
- Reference canonical speech patterns
- Include both strengths and flaws`;

    const prompt = `Create a character profile for ${isOriginal ? "original character" : "canon character"}:

Name: ${name}
Fandom: ${fandom}
Role in Story: ${role}
${baseDescription ? `Additional Details: ${baseDescription}` : ""}

Provide:
1. Personality traits (5-7 key traits)
2. Speech patterns (how they talk, catchphrases, verbal tics)
3. Key relationships (with other characters)
4. Background (brief history)
5. Story potential (what makes them interesting for fanfiction)

Format as structured JSON.`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    // Parse the response to extract structured data
    const content = response.content as string;

    // Create character object
    const character: StoryCharacter = {
      id: `char_${Date.now()}`,
      name,
      fandom,
      personality: [], // Will be extracted from response
      speechPattern: "",
      isOriginal,
    };

    return JSON.stringify({
      character,
      fullProfile: content,
    });
  },
  {
    name: "create_character",
    description:
      "Create a detailed character profile for a canon or original character.",
    schema: z.object({
      name: z.string().describe("Character name"),
      fandom: z.string().describe("The fandom the character is from/for"),
      isOriginal: z
        .boolean()
        .describe("Whether this is an original character (OC) or canon"),
      baseDescription: z
        .string()
        .optional()
        .describe("Basic description or starting point for the character"),
      role: z
        .enum(["main", "supporting", "minor", "antagonist"])
        .describe("The character's role in the story"),
    }),
  }
);

/**
 * Check OOC Tool
 * Analyzes text for out-of-character moments
 */
export const checkOOCTool = tool(
  async ({ text, characters }) => {
    const model = new ChatOpenAI({
      temperature: 0.3, // Lower temperature for analysis
      model: "gpt-4o",
    });

    const characterDescriptions = characters
      .map(
        (c) =>
          `${c.name}:\n  - Personality: ${c.personality.join(", ")}\n  - Speech Pattern: ${c.speechPattern || "Not specified"}`
      )
      .join("\n\n");

    const systemPrompt = `You are an expert editor specializing in fanfiction character consistency.

## Your Task
Analyze the provided text for out-of-character (OOC) moments where characters act or speak inconsistently with their established personalities.

## Character Profiles
${characterDescriptions}

## Analysis Guidelines
- Check dialogue for consistent voice and speech patterns
- Verify actions align with personality traits
- Note any reactions that seem out of character
- Consider context (characters can grow, but changes should make sense)
- Be specific about what's OOC and why
- Provide constructive suggestions for fixes

## Output Format
Return a JSON array of issues found, or an empty array if no issues detected.
Each issue should have:
- characterName: the character with the OOC moment
- issue: description of the OOC behavior
- location: quote or description of where it occurs
- suggestion: how to fix it`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Analyze this text for OOC moments:\n\n${text}`),
    ]);

    const content = response.content as string;

    // Parse response into structured OOCCheckResult array
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const issues = JSON.parse(jsonMatch[0]);
        const results: OOCCheckResult[] = issues.map(
          (issue: {
            characterName: string;
            issue: string;
            location?: string;
            suggestion: string;
          }) => ({
            characterId:
              characters.find((c) => c.name === issue.characterName)?.id ||
              "unknown",
            characterName: issue.characterName,
            issues: [issue.issue],
            suggestions: [issue.suggestion],
          })
        );
        return JSON.stringify(results);
      }
    } catch {
      // If parsing fails, return empty array
    }

    return JSON.stringify([]);
  },
  {
    name: "check_ooc",
    description:
      "Analyze story text for out-of-character moments and provide suggestions.",
    schema: z.object({
      text: z.string().describe("The story text to analyze"),
      characters: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            personality: z.array(z.string()),
            speechPattern: z.string().optional(),
          })
        )
        .describe("Character profiles to check against"),
    }),
  }
);

/**
 * Suggest Character Dialogue Tool
 * Generates in-character dialogue suggestions
 */
export const suggestDialogueTool = tool(
  async ({ character, situation, emotion, responseToLine }) => {
    const model = new ChatOpenAI({
      temperature: 0.85,
      model: "gpt-4o",
    });

    const systemPrompt = `You are an expert at writing in-character dialogue for fanfiction.

## Character Profile
Name: ${character.name}
Fandom: ${character.fandom}
Personality: ${character.personality.join(", ")}
Speech Pattern: ${character.speechPattern || "Not specified"}

## Guidelines
- Capture the character's unique voice
- Include verbal tics and speech patterns
- Consider their emotional state
- Make dialogue feel natural and authentic
- Provide 3 different options`;

    const prompt = `Write dialogue for ${character.name} in this situation:

Situation: ${situation}
Emotional State: ${emotion}
${responseToLine ? `Responding to: "${responseToLine}"` : ""}

Provide 3 dialogue options that sound authentic to this character.`;

    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ]);

    return response.content as string;
  },
  {
    name: "suggest_dialogue",
    description:
      "Generate in-character dialogue suggestions for a specific situation.",
    schema: z.object({
      character: z.object({
        name: z.string(),
        fandom: z.string(),
        personality: z.array(z.string()),
        speechPattern: z.string().optional(),
      }),
      situation: z.string().describe("The context/situation for the dialogue"),
      emotion: z
        .string()
        .describe("The character's emotional state (angry, happy, nervous, etc.)"),
      responseToLine: z
        .string()
        .optional()
        .describe("A line of dialogue they're responding to, if any"),
    }),
  }
);

// Export all character tools
export const characterTools = [
  createCharacterTool,
  checkOOCTool,
  suggestDialogueTool,
];
