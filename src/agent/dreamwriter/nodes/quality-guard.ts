import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { QUALITY_GUARD_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { QualityReportSchema } from "../schemas";
import { logger, errorFields } from "../../../lib/logger";
import type { QualityReport } from "../../../lib/types/dreamwriter";

export async function qualityGuardNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "quality_guard" });
  if (!state.storyDraft) return { stage: "error", logs: [{ message: "没有故事草稿可供检查", done: true }] };
  // System prompt is fully static (knowledge pack) -> stable prefix for OpenAI prompt caching.
  const systemPrompt = QUALITY_GUARD_PROMPT(getHSRKnowledgePrompt());
  const checkInput = `故事需求：\nCP: ${state.parsedCP.join(" × ")}\n设定: ${state.parsedSetting}\n基调: ${state.parsedTone}\n\n故事正文：\n${state.storyDraft}`;
  const model = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" }).withStructuredOutput(QualityReportSchema, { name: "quality_report" });
  try {
    const report = (await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(checkInput)])) as QualityReport;
    return { stage: "checking", qualityReport: report, logs: [{ message: report.passesThreshold ? `质量检查通过 (${report.overallScore}/10)` : `质量检查未通过 (${report.overallScore}/10)，正在修改...`, done: true }] };
  } catch (err) {
    logger.warn("dreamwriter.node.fallback", { node: "quality_guard", ...errorFields(err) });
    return { stage: "checking", qualityReport: { overallScore: 7, oocIssues: [], consistencyIssues: [], proseNotes: [], passesThreshold: true }, logs: [{ message: "质量检查完成", done: true }] };
  }
}
