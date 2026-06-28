import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { SCENE_WRITER_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt, buildRAGContext } from "../prompts/hsr";
import { retrieveRelevantChunks } from "../../../knowledge/base/rag";
import { writerModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";
import { AppError, ErrorCode } from "../../../lib/errors";
import type { SceneOutline, StoryOutline } from "../../../lib/types/dreamwriter";

/** Per-scene-attempt ceiling so one hung LLM call can't eat the whole request budget. */
const SCENE_TIMEOUT_MS = 90_000;

/** Reject if `p` doesn't settle within `ms`; always clears the timer. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

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

  // Per-scene RAG queries are known up-front from the outline and are independent
  // of one another, so fetch them ALL in parallel before the (necessarily
  // sequential, continuity-dependent) write loop — turns N embedding+search round
  // trips into one. The prose itself can't be parallelized: each scene is written
  // against the previous scene's tail + a running turn memo.
  const ragByScene = await Promise.all(
    scenes.map((scene, i) =>
      retrieveRelevantChunks(`${outline.cp.join(" ")} ${scene.summary} ${scene.characters.join(" ")}`, "hsr", 2).catch(
        (e) => {
          logger.warn("dreamwriter.rag.failed", { node: "scene_writer", scene: i + 1, ...errorFields(e) });
          return [] as { content: string }[];
        },
      ),
    ),
  );

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    logger.info("dreamwriter.scene.start", { node: "scene_writer", scene: i + 1, total: scenes.length });

    const ragChunks = ragByScene[i];
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

    // Draft this scene, retrying once on a transient failure/timeout.
    let text = "";
    for (let attempt = 1; attempt <= 2 && !text.trim(); attempt++) {
      try {
        const resp = await withTimeout(
          model.invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)]),
          SCENE_TIMEOUT_MS,
          `scene ${i + 1}`,
        );
        text = typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);
      } catch (e) {
        logger.warn("dreamwriter.scene.retry", { node: "scene_writer", scene: i + 1, attempt, ...errorFields(e) });
      }
    }
    if (!text.trim()) {
      // Fail VISIBLY: a missing scene means a story with a silent gap. Throwing
      // surfaces an error to the user (and prevents persisting/billing for a
      // broken story) instead of quietly shipping N-1 scenes.
      logger.error("dreamwriter.scene.unrecoverable", { node: "scene_writer", scene: i + 1, total: scenes.length });
      throw new AppError(ErrorCode.AGENT_FAILED, `场景 ${i + 1}/${scenes.length} 生成失败`);
    }
    sceneDrafts.push(text.trim());
    turnMemo.push(scene.turn || scene.summary);
  }

  // Completeness invariant: every planned scene must have produced prose.
  if (sceneDrafts.length !== scenes.length) {
    throw new AppError(ErrorCode.AGENT_FAILED, `期望 ${scenes.length} 个场景，仅生成 ${sceneDrafts.length} 个`);
  }

  const storyDraft = sceneDrafts.join("\n\n");
  if (!storyDraft.trim()) throw new AppError(ErrorCode.AGENT_FAILED, "故事生成失败");

  return {
    stage: "writing",
    storyDraft,
    sceneDrafts,
    runningContext: turnMemo.map((t, k) => `${k + 1}. ${t}`).join("\n"),
    ragContext: allRag,
    logs: [{ message: `故事初稿完成（${sceneDrafts.length} 幕），正在进行质量检查...`, done: true }],
  };
}
