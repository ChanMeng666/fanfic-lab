import { OpenAI } from "openai";
import { prisma } from "@/lib/db";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

/**
 * Build the text used to generate a story's embedding for similarity
 * recommendations. Includes signal-rich fields (title, summary, ships,
 * tags) but skips chapter content — for "find me similar stories" we
 * want theme/character signals, not prose-style matching.
 */
export function embeddingTextForStory(input: {
  title: string;
  summary?: string | null;
  fandom: string;
  ships?: string[];
  tags?: string[];
}): string {
  const parts = [
    `标题：${input.title}`,
    `作品：${input.fandom}`,
  ];
  if (input.ships?.length) parts.push(`CP：${input.ships.join("、")}`);
  if (input.tags?.length) parts.push(`标签：${input.tags.join("、")}`);
  if (input.summary) parts.push(`简介：${input.summary}`);
  return parts.join("\n");
}

/**
 * Generate an embedding via OpenAI. Returns the vector or null on error
 * — recommendation generation should never block story creation.
 */
export async function getStoryEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await getOpenAI().embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return res.data[0].embedding;
  } catch (err) {
    console.warn("[story-embedding] generation failed:", err);
    return null;
  }
}

/**
 * Persist an embedding to a Story row. Uses raw SQL because Prisma
 * doesn't yet support direct writes to the `vector` type column.
 */
export async function setStoryEmbedding(storyId: string, embedding: number[]): Promise<void> {
  const vectorStr = `[${embedding.join(",")}]`;
  await prisma.$executeRaw`
    UPDATE "Story" SET embedding = ${vectorStr}::vector WHERE id = ${storyId}
  `;
}
