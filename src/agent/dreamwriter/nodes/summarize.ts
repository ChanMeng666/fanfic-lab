import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { SUMMARIZE_PROMPT } from "../prompts/system";
import { logger, errorFields } from "../../../lib/logger";

export async function summarizeNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "summarize" });

  const story = state.storyDraft;
  const title = state.outline?.title ?? "";

  if (!story) {
    return { summary: "", logs: [{ message: "缺少正文，跳过简介生成", done: true }] };
  }

  try {
    const model = new ChatOpenAI({
      temperature: 0.5,
      model: "gpt-4o-mini",
      maxTokens: 200,
    });
    const response = await model.invoke([
      new SystemMessage(SUMMARIZE_PROMPT),
      new HumanMessage(`标题：${title}\n\n正文：\n${story.slice(0, 4000)}`),
    ]);
    const raw = typeof response.content === "string" ? response.content : "";
    const summary = raw.trim().replace(/^["「『]|["」』]$/g, "");

    if (summary.length >= 30 && summary.length <= 250) {
      return {
        summary,
        logs: [{ message: "简介生成完成", done: true }],
      };
    }
    throw new Error(`summary length out of range: ${summary.length}`);
  } catch (e) {
    logger.warn("dreamwriter.node.fallback", { node: "summarize", ...errorFields(e) });
    // Mid-section fallback so the preview doesn't duplicate the chapter opening.
    const len = story.length;
    const fallback =
      len <= 200 ? story : "…" + story.slice(Math.floor(len / 2), Math.floor(len / 2) + 180).trim() + "…";
    return {
      summary: fallback,
      logs: [{ message: "简介自动生成失败，已使用回退方案", done: true }],
    };
  }
}
