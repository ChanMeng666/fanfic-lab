import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { STORY_ARCHITECT_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import type { StoryOutline } from "../../../lib/types/dreamwriter";

function parseJsonSafe(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function storyArchitectNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== STORY ARCHITECT ==========");
  const knowledgePrompt = getHSRKnowledgePrompt();
  const systemPrompt = STORY_ARCHITECT_PROMPT(knowledgePrompt);
  const requestSummary = `CP: ${state.parsedCP.join(" × ")}\n设定: ${state.parsedSetting}\n基调: ${state.parsedTone}\n约束: ${JSON.stringify(state.parsedConstraints)}`;
  const model = new ChatOpenAI({ temperature: 0.8, model: "gpt-4o" });
  const response = await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(requestSummary)]);
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  try {
    const parsed = parseJsonSafe(content) as unknown as StoryOutline;
    return { stage: "planning", outline: parsed, logs: [{ message: `故事构思完成：${parsed.title}`, done: true }] };
  } catch {
    const fallbackOutline: StoryOutline = { title: `${state.parsedCP.join("×")}的故事`, cp: state.parsedCP, setting: state.parsedSetting, tone: state.parsedTone, wordTarget: 3000, scenes: [{ summary: "完整短篇", characters: state.parsedCP, emotion: state.parsedTone }], emotionalArc: "起承转合" };
    return { stage: "planning", outline: fallbackOutline, logs: [{ message: `故事构思完成：${fallbackOutline.title}`, done: true }] };
  }
}
