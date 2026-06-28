import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { STORY_ARCHITECT_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { StoryOutlineSchema } from "../schemas";
import { architectModel } from "../models";
import { selectBeatTemplate, formatBeatGuidance } from "../beats";
import { logger, errorFields } from "../../../lib/logger";
import { LENGTH_SPECS, type StoryLength } from "../../../lib/billing/pricing";
import type { StoryOutline } from "../../../lib/types/dreamwriter";

/** Resolve the length tier (defaults to medium) into its canonical spec. */
function lengthSpec(length: string | undefined) {
  const key: StoryLength = length === "short" || length === "long" ? length : "medium";
  return { key, ...LENGTH_SPECS[key] };
}

/**
 * Make the outline match the paid length tier deterministically, rather than
 * trusting the LLM's free-picked wordTarget / scene count (which used to let a
 * "short" balloon to multiple thousand words). Sets the canonical wordTarget and
 * caps the scene count, keeping the opening + ending beats when trimming.
 */
function enforceLengthSpec(outline: StoryOutline, spec: { targetWords: number; maxScenes: number }): StoryOutline {
  let scenes = outline.scenes;
  if (scenes.length > spec.maxScenes) {
    // Preserve the first (maxScenes-1) beats and the final beat (the ending) so
    // trimming never drops the resolution.
    scenes = [...scenes.slice(0, Math.max(1, spec.maxScenes - 1)), scenes[scenes.length - 1]];
  }
  return { ...outline, wordTarget: spec.targetWords, scenes };
}

export async function storyArchitectNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "story_architect" });
  // System prompt is fully static (knowledge pack) -> stable prefix for OpenAI prompt caching.
  const systemPrompt = STORY_ARCHITECT_PROMPT(getHSRKnowledgePrompt());
  // Pick the structural beat skeleton for this tone/ending and plan against it.
  const beatTpl = selectBeatTemplate(state.parsedTone, state.parsedConstraints.ending);
  const spec = lengthSpec(state.parsedConstraints.length);
  const povNote = state.parsedConstraints.pov ? `\n指定叙事视角（必须采用）: ${state.parsedConstraints.pov}` : "";
  const requestSummary = `CP: ${state.parsedCP.join(" × ")}\n设定: ${state.parsedSetting}\n基调: ${state.parsedTone}${povNote}\n约束: ${JSON.stringify(state.parsedConstraints)}`;
  // Explicit length budget so the architect plans to the paid tier (the beat
  // template alone doesn't scale with length).
  const lengthNote = `## 篇幅档位：${spec.key}\n目标总字数约 ${spec.targetWords} 字，整篇控制在 ${spec.maxScenes} 幕以内——把上面的节拍合并进这么多幕，不要为了铺满节拍而拉长篇幅。`;
  // Beat guidance + research go in the human turn so the system prompt stays a stable cache prefix.
  const humanText = [
    requestSummary,
    lengthNote,
    formatBeatGuidance(beatTpl),
    state.researchContext ? `## 原著资料参考（联网检索）\n${state.researchContext}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const model = architectModel().withStructuredOutput(StoryOutlineSchema, { name: "outline" });
  try {
    const parsed = (await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)])) as StoryOutline;
    const outline = enforceLengthSpec(parsed, spec);
    return { stage: "planning", outline, logs: [{ message: `故事构思完成：${outline.title}`, done: true }] };
  } catch (err) {
    logger.warn("dreamwriter.node.fallback", { node: "story_architect", ...errorFields(err) });
    const fallbackOutline: StoryOutline = enforceLengthSpec(
      {
        title: `${state.parsedCP.join("×")}的故事`,
        cp: state.parsedCP,
        setting: state.parsedSetting,
        tone: state.parsedTone,
        pov: `第三人称限知·${state.parsedCP[0] ?? "主角"}视角`,
        themeLine: state.parsedTone,
        beatTemplate: beatTpl.label,
        wordTarget: spec.targetWords,
        emotionalArc: beatTpl.beats.join(" → "),
        scenes: beatTpl.beats.map((b) => ({
          summary: b,
          characters: state.parsedCP,
          emotion: state.parsedTone,
          beatType: "日常" as const,
        })),
      },
      spec,
    );
    return { stage: "planning", outline: fallbackOutline, logs: [{ message: `故事构思完成：${fallbackOutline.title}`, done: true }] };
  }
}
