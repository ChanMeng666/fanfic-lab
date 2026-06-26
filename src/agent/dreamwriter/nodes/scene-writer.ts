import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { SCENE_WRITER_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt, buildRAGContext } from "../prompts/hsr";
import { retrieveRelevantChunks } from "../../../knowledge/base/rag";
import { writerModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";
import type { SceneOutline, StoryOutline } from "../../../lib/types/dreamwriter";

/** Story-level metadata block, repeated as the anchor for every scene. */
function storyMeta(o: StoryOutline): string {
  return [
    `标题：${o.title}`,
    `CP：${o.cp.join(" × ")}`,
    `设定：${o.setting}`,
    `基调：${o.tone}`,
    o.pov ? `叙事视角（必须贯穿）：${o.pov}` : "",
    o.themeLine ? `情感内核：${o.themeLine}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Per-scene writing spec built from the rich outline fields. */
function sceneSpec(scene: SceneOutline, index: number, total: number): string {
  return [
    `这是第 ${index + 1} / ${total} 幕。`,
    `本幕内容：${scene.summary}`,
    `出场角色：${scene.characters.join("、")}`,
    `情绪：${scene.emotion}`,
    scene.beatType ? `节拍作用：${scene.beatType}` : "",
    scene.hook ? `开场钩子（用它切入）：${scene.hook}` : "",
    scene.sensoryAnchor ? `核心感官意象（统领本幕氛围）：${scene.sensoryAnchor}` : "",
    scene.turn ? `本幕收尾时要达成的改变：${scene.turn}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Scene-by-scene drafting (replaces the old single-shot writer).
 *
 * Generating a 5k–8k word story in one call flattens pacing and depth. Instead we
 * draft each scene separately with rolling continuity context: a running memo of
 * what changed + the tail of the previous scene. This is the structural fix for
 * long-fic quality — each scene gets the model's full attention and a per-scene
 * word budget, while continuity holds without re-sending the whole draft.
 *
 * This node produces the FIRST full draft only. Quality-driven rewrites are
 * handled surgically by targeted-revision, so this node never reads qualityReport.
 */
export async function sceneWriterNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "scene_writer" });
  const outline = state.outline;
  if (!outline) return { stage: "error", logs: [{ message: "没有故事大纲", done: true }] };

  const scenes = outline.scenes.length > 0 ? outline.scenes : [{ summary: "完整短篇", characters: outline.cp, emotion: outline.tone } as SceneOutline];
  // Static knowledge pack only -> stable system prefix for prompt caching.
  const systemPrompt = SCENE_WRITER_PROMPT(getHSRKnowledgePrompt());
  const perSceneTarget = Math.max(400, Math.round(outline.wordTarget / scenes.length));
  const model = writerModel();

  const sceneDrafts: string[] = [];
  const turnMemo: string[] = [];
  const allRag: string[] = [];
  const meta = storyMeta(outline);
  const researchBlock = state.researchContext ? `## 原著资料参考（联网检索）\n${state.researchContext}` : "";

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    logger.info("dreamwriter.scene.start", { node: "scene_writer", scene: i + 1, total: scenes.length });

    // Per-scene RAG: ground each scene in the passages most relevant to IT.
    let ragChunks: { content: string }[] = [];
    try {
      ragChunks = await retrieveRelevantChunks(`${outline.cp.join(" ")} ${scene.summary} ${scene.characters.join(" ")}`, "hsr", 2);
    } catch (e) {
      logger.warn("dreamwriter.rag.failed", { node: "scene_writer", scene: i + 1, ...errorFields(e) });
    }
    ragChunks.forEach((c) => allRag.push(c.content));

    // Rolling continuity: a memo of prior turns + the tail of the previous scene.
    const prevTail = sceneDrafts.length ? sceneDrafts[sceneDrafts.length - 1].slice(-700) : "";
    const continuity = [
      turnMemo.length ? `## 前情提要（已经发生）\n${turnMemo.map((t, k) => `${k + 1}. ${t}`).join("\n")}` : "",
      prevTail ? `## 上一幕结尾（请自然承接，不要重复这些句子）\n…${prevTail}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const positionNote = i === 0
      ? "这是开篇：用钩子直接切入画面或动作，不要从背景介绍、天气或人物档案式交代起笔。"
      : i === scenes.length - 1
        ? "这是结尾幕：把情感落点收束在 themeLine 上，给一个有余韵的收尾意象，不要强行升华或总结。"
        : "";

    const humanText = [
      meta,
      continuity,
      sceneSpec(scene, i, scenes.length),
      positionNote,
      `本幕目标字数：约 ${perSceneTarget} 字（可上下浮动，以写透为准）。`,
      researchBlock,
      buildRAGContext(ragChunks),
    ]
      .filter(Boolean)
      .join("\n\n---\n\n");

    let text = "";
    try {
      const resp = await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)]);
      text = typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);
    } catch (e) {
      logger.warn("dreamwriter.scene.failed", { node: "scene_writer", scene: i + 1, ...errorFields(e) });
    }
    if (text.trim()) {
      sceneDrafts.push(text.trim());
      turnMemo.push(scene.turn || scene.summary);
    }
  }

  const storyDraft = sceneDrafts.join("\n\n");
  if (!storyDraft.trim()) return { stage: "error", logs: [{ message: "故事生成失败", done: true }] };

  return {
    stage: "writing",
    storyDraft,
    sceneDrafts,
    runningContext: turnMemo.map((t, k) => `${k + 1}. ${t}`).join("\n"),
    ragContext: allRag,
    logs: [{ message: `故事初稿完成（${sceneDrafts.length} 幕），正在进行质量检查...`, done: true }],
  };
}
