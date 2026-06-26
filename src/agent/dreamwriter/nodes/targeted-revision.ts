import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { REVISION_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { writerModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";

/**
 * Surgical revision: rewrite ONLY the scenes the critic flagged, splicing them
 * back into the draft. The old pipeline regenerated the entire story from
 * feedback — discarding good prose to fix one OOC line. Here we preserve every
 * scene that passed and re-write the few that didn't, with surrounding scenes
 * supplied for continuity.
 */
export async function targetedRevisionNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "targeted_revision", revision: state.revisionCount + 1 });
  const report = state.qualityReport;
  const scenes = [...state.sceneDrafts];
  const outline = state.outline;

  // Only revise in-range, genuinely-flagged scenes (cap at 3 to bound cost).
  const flagged = (report?.flaggedScenes ?? [])
    .filter((f) => f.sceneIndex >= 0 && f.sceneIndex < scenes.length)
    .slice(0, 3);

  if (scenes.length === 0 || flagged.length === 0) {
    // Nothing actionable to target; just advance the counter so routing exits the loop.
    return { revisionCount: state.revisionCount + 1, stage: "revising", logs: [{ message: "无可定向修改的场景，跳过修订", done: true }] };
  }

  const systemPrompt = REVISION_PROMPT(getHSRKnowledgePrompt());
  const model = writerModel();
  const globalAiFlags = report?.aiFlavorFlags ?? [];

  for (const f of flagged) {
    const i = f.sceneIndex;
    const sceneSpec = outline?.scenes[i];
    const prevTail = i > 0 ? scenes[i - 1].slice(-500) : "";
    const nextHead = i < scenes.length - 1 ? scenes[i + 1].slice(0, 500) : "";

    const humanText = [
      `这是第 ${i} 幕（共 ${scenes.length} 幕）。`,
      sceneSpec ? `本幕设定：${sceneSpec.summary}${sceneSpec.turn ? `；收尾改变：${sceneSpec.turn}` : ""}` : "",
      `## 编辑指出的问题\n${f.problem}\n## 修改方向\n${f.fix}`,
      globalAiFlags.length ? `## 需要清除的『AI味』写法（如本幕出现）\n${globalAiFlags.map((s) => `- ${s}`).join("\n")}` : "",
      prevTail ? `## 上一幕结尾（承接它）\n…${prevTail}` : "",
      nextHead ? `## 下一幕开头（要能顺到它）\n${nextHead}…` : "",
      `## 当前这一幕原文（在此基础上改）\n${scenes[i]}`,
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    try {
      const resp = await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)]);
      const rewritten = typeof resp.content === "string" ? resp.content.trim() : "";
      if (rewritten) scenes[i] = rewritten;
    } catch (e) {
      logger.warn("dreamwriter.revision.scene_failed", { node: "targeted_revision", scene: i, ...errorFields(e) });
    }
  }

  const storyDraft = scenes.join("\n\n");
  return {
    revisionCount: state.revisionCount + 1,
    stage: "revising",
    sceneDrafts: scenes,
    storyDraft,
    logs: [{ message: `已定向重写 ${flagged.length} 个场景（第 ${state.revisionCount + 1} 轮）`, done: true }],
  };
}
