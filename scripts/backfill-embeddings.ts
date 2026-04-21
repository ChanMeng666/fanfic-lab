/**
 * Generate recommendation embeddings for any Story rows that are missing
 * one. Safe to re-run; idempotent because it only processes rows where
 * embedding IS NULL.
 *
 * Usage:
 *   npm run backfill-embeddings                  # dry-run scan
 *   npm run backfill-embeddings -- --apply       # actually write
 *   npm run backfill-embeddings -- --apply --limit 50
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { OpenAI } from "openai";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["error"] });
}

const prisma = createPrismaClient();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

interface Args {
  apply: boolean;
  limit?: number;
  delayMs: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
  const delayArg = argv.find((a) => a.startsWith("--delay="));
  const delayMs = delayArg ? parseInt(delayArg.split("=")[1], 10) : 300;
  return { apply, limit, delayMs };
}

function buildEmbeddingText(s: {
  title: string;
  summary: string | null;
  fandom: string;
  ships: string[];
  tags: string[];
}): string {
  const parts = [`标题：${s.title}`, `作品：${s.fandom}`];
  if (s.ships.length) parts.push(`CP：${s.ships.join("、")}`);
  if (s.tags.length) parts.push(`标签：${s.tags.join("、")}`);
  if (s.summary) parts.push(`简介：${s.summary}`);
  return parts.join("\n");
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

async function setEmbedding(storyId: string, embedding: number[]) {
  const vectorStr = `[${embedding.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "Story" SET embedding = $1::vector WHERE id = $2`,
    vectorStr,
    storyId
  );
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs();
  console.log(
    `\n[backfill-embeddings] mode=${args.apply ? "APPLY" : "DRY-RUN"} limit=${args.limit ?? "∞"} delay=${args.delayMs}ms\n`
  );

  if (!process.env.OPENAI_API_KEY) {
    console.error("✗ OPENAI_API_KEY not set");
    process.exit(1);
  }

  // Raw query — Prisma model doesn't expose the unsupported `vector` field
  // for filtering, so we use a raw SELECT to find rows with NULL embedding.
  const candidateIds = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Story" WHERE embedding IS NULL ORDER BY "createdAt" DESC ${
      args.limit ? `LIMIT ${args.limit}` : ""
    }`
  );

  console.log(`Candidates needing embeddings: ${candidateIds.length}\n`);
  if (candidateIds.length === 0) {
    console.log("Nothing to do. ✓");
    return;
  }

  const ids = candidateIds.map((r) => r.id);
  const stories = await prisma.story.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, summary: true, fandom: true, ships: true, tags: true },
  });
  const byId = new Map(stories.map((s) => [s.id, s]));

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const s = byId.get(id);
    if (!s) continue;

    const prefix = `[${i + 1}/${ids.length}] ${id} 「${s.title}」`;

    if (!args.apply) {
      console.log(`${prefix} would generate embedding`);
      skipped++;
      continue;
    }

    try {
      const text = buildEmbeddingText(s);
      const embedding = await getEmbedding(text);
      await setEmbedding(id, embedding);
      console.log(`${prefix} ✓ embedding stored (${embedding.length}-d)`);
      ok++;
    } catch (err) {
      console.warn(
        `${prefix} ✗ ${err instanceof Error ? err.message : String(err)}`
      );
      failed++;
    }

    if (i < ids.length - 1) await sleep(args.delayMs);
  }

  console.log(
    `\nDone. ok=${ok} failed=${failed} skipped=${skipped} (apply=${args.apply})`
  );
}

main()
  .catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
