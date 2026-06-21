import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { WRITER_PROMPT } from "../prompts/system";
import { getHSRKnowledgePrompt, buildRAGContext } from "../prompts/hsr";
import { retrieveRelevantChunks } from "../../../knowledge/base/rag";
import { logger, errorFields } from "../../../lib/logger";

export async function writerNode(state: DreamWriterState, _config: RunnableConfig): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "writer", revision: state.revisionCount });
  const outline = state.outline;
  if (!outline) return { stage: "error", logs: [{ message: "没有故事大纲", done: true }] };

  const ragQuery = `${outline.cp.join(" ")} ${outline.setting} ${outline.scenes.map((s) => s.summary).join(" ")}`;
  let ragChunks: { content: string }[] = [];
  try { ragChunks = await retrieveRelevantChunks(ragQuery, "hsr", 3); } catch (e) { logger.warn("dreamwriter.rag.failed", { node: "writer", ...errorFields(e) }); }

  // Keep the system prompt fully static (knowledge pack only) so it forms a stable prefix
  // for OpenAI prompt caching. The per-request RAG passages go in the human turn instead.
  const systemPrompt = WRITER_PROMPT(getHSRKnowledgePrompt());
  const ragContext = buildRAGContext(ragChunks);

  const outlineText = `标题：${outline.title}\nCP：${outline.cp.join(" × ")}\n设定：${outline.setting}\n基调：${outline.tone}\n目标字数：${outline.wordTarget}\n情感曲线：${outline.emotionalArc}\n\n场景安排：\n${outline.scenes.map((s, i) => `${i + 1}. ${s.summary}（角色：${s.characters.join("、")}，情绪：${s.emotion}）`).join("\n")}${state.qualityReport ? `\n\n上一版的质量反馈（请针对性修改）：\n${state.qualityReport.oocIssues.map((i) => `- ${i.character}: ${i.issue} → ${i.suggestion}`).join("\n")}\n${state.qualityReport.proseNotes.map((n) => `- ${n}`).join("\n")}` : ""}`;
  const humanText = ragContext ? `${ragContext}\n\n---\n\n${outlineText}` : outlineText;

  const model = new ChatOpenAI({ temperature: 0.9, model: "gpt-4o" });
  const response = await model.invoke([new SystemMessage(systemPrompt), new HumanMessage(humanText)]);
  const story = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  return { stage: "writing", storyDraft: story, ragContext: ragChunks.map((c) => c.content), logs: [{ message: "故事初稿完成，正在进行质量检查...", done: true }] };
}
