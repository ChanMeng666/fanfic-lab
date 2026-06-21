import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { STORY_ARCHITECT_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { StoryOutlineSchema } from "../schemas";
import { logger, errorFields } from "../../../lib/logger";
import type { StoryOutline } from "../../../lib/types/dreamwriter";

export async function storyArchitectNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "story_architect" });
  // System prompt is fully static (knowledge pack) -> stable prefix for OpenAI prompt caching.
  const systemPrompt = STORY_ARCHITECT_PROMPT(getHSRKnowledgePrompt());
  const requestSummary = `CP: ${state.parsedCP.join(" × ")}\n设定: ${state.parsedSetting}\n基调: ${state.parsedTone}\n约束: ${JSON.stringify(state.parsedConstraints)}`;
  // Variable research goes in the human turn so the system prompt stays a stable cache prefix.
  const humanText = state.researchContext
    ? `${requestSummary}\n\n## 原著资料参考（联网检索）\n${state.researchContext}`
    : requestSummary;
  const model = new ChatOpenAI({ temperature: 0.8, model: "gpt-4o" }).withStructuredOutput(StoryOutlineSchema, { name: "outline" });
  try {
    const parsed = (await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)])) as StoryOutline;
    return { stage: "planning", outline: parsed, logs: [{ message: `故事构思完成：${parsed.title}`, done: true }] };
  } catch (err) {
    logger.warn("dreamwriter.node.fallback", { node: "story_architect", ...errorFields(err) });
    const fallbackOutline: StoryOutline = { title: `${state.parsedCP.join("×")}的故事`, cp: state.parsedCP, setting: state.parsedSetting, tone: state.parsedTone, wordTarget: 3000, scenes: [{ summary: "完整短篇", characters: state.parsedCP, emotion: state.parsedTone }], emotionalArc: "起承转合" };
    return { stage: "planning", outline: fallbackOutline, logs: [{ message: `故事构思完成：${fallbackOutline.title}`, done: true }] };
  }
}
