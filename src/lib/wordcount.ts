/**
 * Bilingual word count: each Chinese character counts as 1, and runs of
 * non-Chinese characters split on whitespace count as English words.
 * Mirrors the logic in src/agent/dreamwriter/nodes/delivery.ts so chapter
 * edits and agent-generated chapters stay consistent.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const chinese = (text.match(/[一-鿿]/g) || []).length;
  const english = text
    .replace(/[一-鿿]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return chinese + english;
}
