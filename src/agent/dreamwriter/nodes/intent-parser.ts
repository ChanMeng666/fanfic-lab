import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { INTENT_PARSER_PROMPT } from "../prompts/system";
import { IntentSchema } from "../schemas";
import { logger, errorFields } from "../../../lib/logger";

export async function intentParserNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "intent_parser" });
  const lastMessage = state.messages[state.messages.length - 1];
  const userInput = typeof lastMessage.content === "string" ? lastMessage.content : JSON.stringify(lastMessage.content);
  const model = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" }).withStructuredOutput(IntentSchema, { name: "intent" });
  try {
    const parsed = await model.invoke([new SystemMessage(INTENT_PARSER_PROMPT), new HumanMessage(userInput)]);
    return {
      stage: "parsing",
      parsedCP: parsed.cp,
      parsedSetting: parsed.setting || "原著向",
      parsedTone: parsed.tone || "甜",
      parsedConstraints: parsed.constraints as unknown as Record<string, string>,
      detectedLanguage: parsed.language,
      logs: [{ message: "已理解你的创作需求", done: true }],
    };
  } catch (err) {
    logger.warn("dreamwriter.node.fallback", { node: "intent_parser", ...errorFields(err) });
    return { stage: "parsing", parsedCP: [], parsedSetting: "原著向", parsedTone: "甜", parsedConstraints: { ending: "HE", rating: "T", length: "medium" }, detectedLanguage: "zh", logs: [{ message: "已理解你的创作需求（使用默认设定）", done: true }] };
  }
}
