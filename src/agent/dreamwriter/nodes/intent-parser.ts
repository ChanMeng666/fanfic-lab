import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { INTENT_PARSER_PROMPT } from "../prompts/system";

function parseJsonSafe(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function intentParserNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== INTENT PARSER ==========");
  const lastMessage = state.messages[state.messages.length - 1];
  const userInput = typeof lastMessage.content === "string" ? lastMessage.content : JSON.stringify(lastMessage.content);
  const model = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" });
  const response = await model.invoke([new SystemMessage(INTENT_PARSER_PROMPT), new HumanMessage(userInput)]);
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  try {
    const parsed = parseJsonSafe(content) as { cp: string[]; setting: string; tone: string; constraints: Record<string, string>; language: "zh" | "en" };
    return { stage: "parsing", parsedCP: parsed.cp || [], parsedSetting: parsed.setting || "原著向", parsedTone: parsed.tone || "甜", parsedConstraints: parsed.constraints || {}, detectedLanguage: parsed.language || "zh", logs: [{ message: "已理解你的创作需求", done: true }] };
  } catch {
    return { stage: "parsing", parsedCP: [], parsedSetting: "原著向", parsedTone: "甜", parsedConstraints: { ending: "HE", rating: "T", length: "medium" }, detectedLanguage: "zh", logs: [{ message: "已理解你的创作需求（使用默认设定）", done: true }] };
  }
}
