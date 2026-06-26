import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { INTENT_PARSER_PROMPT } from "../prompts/system";
import { IntentSchema } from "../schemas";
import { utilityModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";

export async function intentParserNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "intent_parser" });

  // Fast path: structured form input. Use it directly — no LLM parse needed —
  // which is more reliable than inferring CP/tone/setting from free text. The
  // free-text 灵感补充 + 必含梗 + 避雷 fold into specificRequests for the writer.
  const reqLength = state.requestedLength?.trim() || "medium";
  const si = state.inputIntent;
  if (si && Array.isArray(si.cp) && si.cp.length > 0) {
    const extras = [
      si.freeText?.trim() ? si.freeText.trim() : "",
      si.mustInclude?.trim() ? `必须包含：${si.mustInclude.trim()}` : "",
      si.avoid?.length ? `避雷（不要出现）：${si.avoid.join("、")}` : "",
      si.pov?.trim() ? `指定叙事视角：${si.pov.trim()}` : "",
    ]
      .filter(Boolean)
      .join("；");
    return {
      stage: "parsing",
      parsedCP: si.cp,
      parsedSetting: si.setting?.trim() || "原著向",
      parsedTone: si.tone?.trim() || "甜",
      parsedConstraints: {
        ending: si.ending?.trim() || "HE",
        rating: si.rating?.trim() || "T",
        length: reqLength,
        specificRequests: extras,
        ...(si.pov?.trim() ? { pov: si.pov.trim() } : {}),
      },
      detectedLanguage: "zh",
      logs: [{ message: "已采用你的定制设定", done: true }],
    };
  }

  const lastMessage = state.messages[state.messages.length - 1];
  const userInput = typeof lastMessage.content === "string" ? lastMessage.content : JSON.stringify(lastMessage.content);
  const model = utilityModel({ temperature: 0.3 }).withStructuredOutput(IntentSchema, { name: "intent" });
  try {
    const parsed = await model.invoke([new SystemMessage(INTENT_PARSER_PROMPT), new HumanMessage(userInput)]);
    // The UI-selected length is authoritative (it's what the user paid for),
    // overriding any length the model inferred from the prompt text.
    const constraints = { ...(parsed.constraints as unknown as Record<string, string>), length: reqLength };
    return {
      stage: "parsing",
      parsedCP: parsed.cp,
      parsedSetting: parsed.setting || "原著向",
      parsedTone: parsed.tone || "甜",
      parsedConstraints: constraints,
      detectedLanguage: parsed.language,
      logs: [{ message: "已理解你的创作需求", done: true }],
    };
  } catch (err) {
    logger.warn("dreamwriter.node.fallback", { node: "intent_parser", ...errorFields(err) });
    return { stage: "parsing", parsedCP: [], parsedSetting: "原著向", parsedTone: "甜", parsedConstraints: { ending: "HE", rating: "T", length: reqLength }, detectedLanguage: "zh", logs: [{ message: "已理解你的创作需求（使用默认设定）", done: true }] };
  }
}
