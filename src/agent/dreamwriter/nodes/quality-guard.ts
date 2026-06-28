import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { QUALITY_GUARD_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { QualityReportSchema } from "../schemas";
import { criticModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";
import type { QualityReport } from "../../../lib/types/dreamwriter";

/** Quality bar (0–10). A draft at/above this passes; below it gets a revision pass. */
export const PASS_THRESHOLD = 8;

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

  // Try the critic up to twice (transient API errors shouldn't bypass QA).
  let report: QualityReport | null = null;
  for (let attempt = 1; attempt <= 2 && !report; attempt++) {
    try {
      report = (await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(checkInput)])) as QualityReport;
    } catch (err) {
      logger.warn("dreamwriter.node.retry", { node: "quality_guard", attempt, ...errorFields(err) });
    }
  }

  if (!report) {
    // Fail CLOSED: never fabricate a passing report when the critic crashed (the
    // old behavior silently set passesThreshold=true, hiding the failure). Deliver
    // the story so the user's work isn't lost, but record that QA could not run
    // and skip targeted revision (no flagged scenes to target).
    logger.error("dreamwriter.quality_guard.unavailable", { node: "quality_guard" });
    return {
      stage: "checking",
      qualityReport: {
        overallScore: 6,
        dimensions: { characterFidelity: 6, pacing: 6, proseTexture: 6, emotionalPayoff: 6, dialogue: 6, immersion: 6 },
        oocIssues: [],
        aiFlavorFlags: [],
        flaggedScenes: [],
        proseNotes: ["质量检查未能完成（系统繁忙），本次跳过定向修改"],
        passesThreshold: false,
      },
      logs: [{ message: "质量检查未能完成，已跳过定向修改", done: true }],
    };
  }

  // Single source of truth for the pass/fail gate: derive it from the score
  // (>= PASS_THRESHOLD), rather than trusting the model's self-reported flag.
  const passesThreshold = report.overallScore >= PASS_THRESHOLD;
  const normalized: QualityReport = { ...report, passesThreshold };
  return {
    stage: "checking",
    qualityReport: normalized,
    logs: [{ message: passesThreshold ? `质量检查通过 (${report.overallScore}/10)` : `质量检查未通过 (${report.overallScore}/10)，正在定向修改...`, done: true }],
  };
}
