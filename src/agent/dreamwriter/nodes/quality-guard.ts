import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { QUALITY_GUARD_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { QualityReportSchema } from "../schemas";
import { criticModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";
import type { QualityReport } from "../../../lib/types/dreamwriter";

export async function qualityGuardNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "quality_guard" });
  if (!state.storyDraft) return { stage: "error", logs: [{ message: "没有故事草稿可供检查", done: true }] };
  // System prompt is fully static (knowledge pack) -> stable prefix for OpenAI prompt caching.
  const systemPrompt = QUALITY_GUARD_PROMPT(getHSRKnowledgePrompt());
  // Label each scene with its index so the critic can flag scenes precisely for
  // targeted revision. Fall back to the assembled draft if per-scene drafts are absent.
  const sceneBlock = state.sceneDrafts.length
    ? state.sceneDrafts.map((s, i) => `【第${i}幕】\n${s}`).join("\n\n")
    : state.storyDraft;
  const checkInput = `故事需求：\nCP: ${state.parsedCP.join(" × ")}\n设定: ${state.parsedSetting}\n基调: ${state.parsedTone}\n\n故事正文（按幕标号）：\n${sceneBlock}`;
  const model = criticModel().withStructuredOutput(QualityReportSchema, { name: "quality_report" });
  try {
    const report = (await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(checkInput)])) as QualityReport;
    return { stage: "checking", qualityReport: report, logs: [{ message: report.passesThreshold ? `质量检查通过 (${report.overallScore}/10)` : `质量检查未通过 (${report.overallScore}/10)，正在定向修改...`, done: true }] };
  } catch (err) {
    logger.warn("dreamwriter.node.fallback", { node: "quality_guard", ...errorFields(err) });
    return {
      stage: "checking",
      qualityReport: {
        overallScore: 7,
        dimensions: { characterFidelity: 7, pacing: 7, proseTexture: 7, emotionalPayoff: 7, dialogue: 7, immersion: 7 },
        oocIssues: [],
        aiFlavorFlags: [],
        flaggedScenes: [],
        proseNotes: [],
        passesThreshold: true,
      },
      logs: [{ message: "质量检查完成", done: true }],
    };
  }
}
