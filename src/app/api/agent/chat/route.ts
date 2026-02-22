import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import type {
  EditorAIRequest,
  EditorAIResponse,
  StoryContext,
} from "@/lib/types/agent-state";
import {
  EDITOR_CONTINUE_PROMPT,
  EDITOR_EXPAND_PROMPT,
  EDITOR_POLISH_PROMPT,
  EDITOR_OOC_PROMPT,
} from "@/agent/prompts";

const model = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0.8,
});

function buildSystemMessage(
  action: EditorAIRequest["action"],
  storyContext: StoryContext,
  options?: EditorAIRequest["options"]
): string {
  const contextBlock = [
    `Fandom: ${storyContext.fandom}`,
    storyContext.ships.length > 0
      ? `Ships: ${storyContext.ships.join(", ")}`
      : null,
    storyContext.tone ? `Tone: ${storyContext.tone}` : null,
    storyContext.setting ? `Setting: ${storyContext.setting}` : null,
    storyContext.characters.length > 0
      ? `Characters: ${storyContext.characters.map((c) => c.name).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const base = `You are a skilled fanfiction writing assistant.\n\n## Story Context\n${contextBlock}\n\n`;

  switch (action) {
    case "continue":
      return base + EDITOR_CONTINUE_PROMPT;
    case "expand":
      return (
        base + EDITOR_EXPAND_PROMPT(options?.focusArea || "general")
      );
    case "polish":
      return (
        base + EDITOR_POLISH_PROMPT(options?.intensity || "medium")
      );
    case "ooc_check":
      return (
        base +
        EDITOR_OOC_PROMPT(
          storyContext.characters.map((c) => c.name)
        )
      );
    default:
      return base;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EditorAIRequest;
    const { action, content, selectedText, storyContext, options } = body;

    if (!action || !content || !storyContext) {
      return NextResponse.json(
        { error: "Missing required fields: action, content, storyContext" },
        { status: 400 }
      );
    }

    const systemMessage = buildSystemMessage(action, storyContext, options);

    // Build the user message based on action
    let userMessage: string;
    switch (action) {
      case "continue":
        userMessage = `Here is the story so far:\n\n${content}\n\nContinue the story naturally from where it left off.`;
        break;
      case "expand":
        userMessage = `Here is the full story:\n\n${content}\n\nExpand this selected passage:\n\n${selectedText || content}`;
        break;
      case "polish":
        userMessage = `Polish this text:\n\n${selectedText || content}`;
        break;
      case "ooc_check":
        userMessage = `Check this story content for out-of-character moments:\n\n${content}`;
        break;
      default:
        userMessage = content;
    }

    const response = await model.invoke([
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ]);

    const result =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const aiResponse: EditorAIResponse = {
      result,
      type: action,
    };

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error("Editor AI error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Editor AI request failed",
      },
      { status: 500 }
    );
  }
}
