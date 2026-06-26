import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { DELIVERY_PROMPT } from "../prompts/system";
import { DeliverySuggestionsSchema } from "../schemas";
import { utilityModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";
import type { StoryResult } from "../../../lib/types/dreamwriter";

function countWords(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = text.replace(/[\u4e00-\u9fff]/g, "").trim().split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

export async function deliveryNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "delivery" });
  const outline = state.outline;
  const story = state.storyDraft;
  if (!outline || !story) return { stage: "error", logs: [{ message: "缺少故事数据", done: true }] };

  let suggestions: string[] = [];
  try {
    const model = utilityModel({ temperature: 0.7 }).withStructuredOutput(DeliverySuggestionsSchema, { name: "suggestions" });
    const parsed = await model.invoke([new SystemMessage(DELIVERY_PROMPT), new HumanMessage(`当前故事：${outline.title}\nCP: ${outline.cp.join(" × ")}\n设定: ${outline.setting}\n基调: ${outline.tone}`)]);
    suggestions = parsed.suggestions;
  } catch (err) { logger.warn("dreamwriter.node.fallback", { node: "delivery", ...errorFields(err) }); suggestions = ["换一个设定试试？", "试试不同的情感基调？", "看看其他CP？"]; }

  // Tags: setting + tone + the beat-template genre, de-duplicated.
  const tags = Array.from(new Set([outline.setting, outline.tone, outline.beatTemplate].filter(Boolean) as string[]));
  const result: StoryResult = { title: outline.title, body: story, summary: state.summary || "", cp: outline.cp, tags, setting: outline.setting, wordCount: countWords(story), qualityScore: state.qualityReport?.overallScore ?? 7, language: state.detectedLanguage, suggestions, rating: state.parsedConstraints?.rating };
  return { stage: "complete", result, logs: [{ message: `创作完成！《${result.title}》共 ${result.wordCount} 字`, done: true }] };
}
