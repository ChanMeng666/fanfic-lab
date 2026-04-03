import { hsrKnowledge } from "@/knowledge/hsr";

export function getHSRKnowledgePrompt(): string {
  return hsrKnowledge.toSystemPrompt();
}

export function buildRAGContext(chunks: { content: string }[]): string {
  if (chunks.length === 0) return "";
  return `\n\n## 原著参考段落\n以下是与当前创作相关的原著段落，请参考其中的描写风格和细节：\n\n${chunks.map((c, i) => `[参考${i + 1}] ${c.content}`).join("\n\n")}`;
}
