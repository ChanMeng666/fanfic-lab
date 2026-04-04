import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { DELIVERY_PROMPT } from "../prompts/system";
import type { StoryResult } from "../../../lib/types/dreamwriter";

function parseJsonSafe(text: string): unknown {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

function countWords(text: string): number {
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = text.replace(/[\u4e00-\u9fff]/g, "").trim().split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

export async function deliveryNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== DELIVERY ==========");
  const outline = state.outline;
  const story = state.storyDraft;
  if (!outline || !story) return { stage: "error", logs: [{ message: "缺少故事数据", done: true }] };

  let suggestions: string[] = [];
  try {
    const model = new ChatOpenAI({ temperature: 0.7, model: "gpt-4o-mini" });
    const response = await model.invoke([new SystemMessage(DELIVERY_PROMPT), new HumanMessage(`当前故事：${outline.title}\nCP: ${outline.cp.join(" × ")}\n设定: ${outline.setting}\n基调: ${outline.tone}`)]);
    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    suggestions = parseJsonSafe(content) as unknown as string[];
  } catch { suggestions = ["换一个设定试试？", "试试不同的情感基调？", "看看其他CP？"]; }

  const result: StoryResult = { title: outline.title, body: story, cp: outline.cp, tags: [outline.setting, outline.tone], setting: outline.setting, wordCount: countWords(story), qualityScore: state.qualityReport?.overallScore ?? 7, language: state.detectedLanguage, suggestions };
  return { stage: "complete", result, logs: [{ message: `创作完成！《${result.title}》共 ${result.wordCount} 字`, done: true }] };
}
