import { prisma } from "../../lib/db";
import { OpenAI } from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function retrieveRelevantChunks(
  query: string,
  fandom: string = "hsr",
  limit: number = 5
): Promise<{ content: string; metadata: Record<string, unknown> }[]> {
  const embedding = await getEmbedding(query);
  const vectorStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw<
    { content: string; metadata: string; distance: number }[]
  >`
    SELECT content, metadata::text, embedding <=> ${vectorStr}::vector AS distance
    FROM "KnowledgeChunk"
    WHERE fandom = ${fandom}
    ORDER BY distance ASC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    content: r.content,
    metadata: JSON.parse(r.metadata),
  }));
}

export async function ingestChunk(
  content: string,
  fandom: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const embedding = await getEmbedding(content);
  const vectorStr = `[${embedding.join(",")}]`;
  const metadataStr = JSON.stringify(metadata);

  await prisma.$executeRaw`
    INSERT INTO "KnowledgeChunk" (id, fandom, content, embedding, metadata, "createdAt")
    VALUES (gen_random_uuid(), ${fandom}, ${content}, ${vectorStr}::vector, ${metadataStr}::jsonb, NOW())
  `;
}
