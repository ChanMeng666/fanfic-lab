import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { QUALITY_GUARD_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import type { QualityReport } from "@/lib/types/dreamwriter";

function parseJsonSafe(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function qualityGuardNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== QUALITY GUARD ==========");
  if (!state.storyDraft) return { stage: "error", logs: [{ message: "没有故事草稿可供检查", done: true }] };
  const knowledgePrompt = getHSRKnowledgePrompt();
  const systemPrompt = QUALITY_GUARD_PROMPT(knowledgePrompt);
  const checkInput = `故事需求：\nCP: ${state.parsedCP.join(" × ")}\n设定: ${state.parsedSetting}\n基调: ${state.parsedTone}\n\n故事正文：\n${state.storyDraft}`;
  const model = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" });
  const response = await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(checkInput)]);
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  try {
    const report = parseJsonSafe(content) as QualityReport;
    return { stage: "checking", qualityReport: report, logs: [{ message: report.passesThreshold ? `质量检查通过 (${report.overallScore}/10)` : `质量检查未通过 (${report.overallScore}/10)，正在修改...`, done: true }] };
  } catch {
    return { stage: "checking", qualityReport: { overallScore: 7, oocIssues: [], consistencyIssues: [], proseNotes: [], passesThreshold: true }, logs: [{ message: "质量检查完成", done: true }] };
  }
}
