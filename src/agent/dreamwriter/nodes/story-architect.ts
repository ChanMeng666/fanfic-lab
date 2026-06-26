import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { STORY_ARCHITECT_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { StoryOutlineSchema } from "../schemas";
import { architectModel } from "../models";
import { selectBeatTemplate, formatBeatGuidance } from "../beats";
import { logger, errorFields } from "../../../lib/logger";
import type { StoryOutline } from "../../../lib/types/dreamwriter";

export async function storyArchitectNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "story_architect" });
  // System prompt is fully static (knowledge pack) -> stable prefix for OpenAI prompt caching.
  const systemPrompt = STORY_ARCHITECT_PROMPT(getHSRKnowledgePrompt());
  // Pick the structural beat skeleton for this tone/ending and plan against it.
  const beatTpl = selectBeatTemplate(state.parsedTone, state.parsedConstraints.ending);
  const povNote = state.parsedConstraints.pov ? `\n指定叙事视角（必须采用）: ${state.parsedConstraints.pov}` : "";
  const requestSummary = `CP: ${state.parsedCP.join(" × ")}\n设定: ${state.parsedSetting}\n基调: ${state.parsedTone}${povNote}\n约束: ${JSON.stringify(state.parsedConstraints)}`;
  // Beat guidance + research go in the human turn so the system prompt stays a stable cache prefix.
  const humanText = [
    requestSummary,
    formatBeatGuidance(beatTpl),
    state.researchContext ? `## 原著资料参考（联网检索）\n${state.researchContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const model = architectModel().withStructuredOutput(StoryOutlineSchema, { name: "outline" });
  try {
    const parsed = (await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)])) as StoryOutline;
    return { stage: "planning", outline: parsed, logs: [{ message: `故事构思完成：${parsed.title}`, done: true }] };
  } catch (err) {
    logger.warn("dreamwriter.node.fallback", { node: "story_architect", ...errorFields(err) });
    const fallbackOutline: StoryOutline = {
      title: `${state.parsedCP.join("×")}的故事`,
      cp: state.parsedCP,
      setting: state.parsedSetting,
      tone: state.parsedTone,
      pov: `第三人称限知·${state.parsedCP[0] ?? "主角"}视角`,
      themeLine: state.parsedTone,
      beatTemplate: beatTpl.label,
      wordTarget: 3000,
      emotionalArc: beatTpl.beats.join(" → "),
      scenes: beatTpl.beats.map((b) => ({
        summary: b,
        characters: state.parsedCP,
        emotion: state.parsedTone,
        beatType: "日常" as const,
      })),
    };
    return { stage: "planning", outline: fallbackOutline, logs: [{ message: `故事构思完成：${fallbackOutline.title}`, done: true }] };
  }
}
