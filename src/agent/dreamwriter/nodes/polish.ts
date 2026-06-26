import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { POLISH_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt } from "../prompts/hsr";
import { polishModel } from "../models";
import { logger, errorFields } from "../../../lib/logger";

/**
 * Final language-only pass over the assembled draft: smooth transitions, unify
 * voice, and strip residual "AI flavor". A known high-ROI move for perceived
 * quality. Skipped for short stories (cost) and degrades to the raw draft on
 * failure. Output goes to polishedBody; delivery prefers it over storyDraft.
 */
export async function polishNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "polish" });
  const draft = state.storyDraft;
  if (!draft.trim()) return { logs: [{ message: "无正文可润色，跳过", done: true }] };

  // Skip polish for short pieces — the marginal quality gain rarely justifies the
  // extra frontier-model call on a 1.5k-word draft.
  const length = state.parsedConstraints?.length;
  if (length === "short") {
    return { polishedBody: draft, logs: [{ message: "短篇跳过润色", done: true }] };
  }

  const aiFlags = state.qualityReport?.aiFlavorFlags ?? [];
  const systemPrompt = POLISH_PROMPT(getHSRKnowledgePrompt());
  const humanText = [
    aiFlags.length ? `## 重点清除这些『AI味』写法（如仍存在）\n${aiFlags.map((s) => `- ${s}`).join("\n")}` : "",
    `## 待润色全文\n${draft}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const resp = await polishModel().invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)]);
    const polished = typeof resp.content === "string" ? resp.content.trim() : "";
    // Guard against a model that returns a truncated or empty result: only accept
    // if it's substantial relative to the draft.
    if (polished.length >= draft.length * 0.6) {
      // Overwrite storyDraft too, so summarize + delivery downstream use the polished text.
      return { storyDraft: polished, polishedBody: polished, logs: [{ message: "终稿润色完成", done: true }] };
    }
    throw new Error(`polish output too short: ${polished.length} vs ${draft.length}`);
  } catch (e) {
    logger.warn("dreamwriter.node.fallback", { node: "polish", ...errorFields(e) });
    return { polishedBody: draft, logs: [{ message: "润色跳过，使用初稿", done: true }] };
  }
}
