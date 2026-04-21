/**
 * Backfill summaries for stories created before the agent's summarize node
 * was deployed. The old API route stored `body.substring(0, 200)` as the
 * summary, which made every card preview duplicate the chapter opening.
 *
 * Detection: any Story whose first chapter content starts with its summary
 * (i.e. summary is a prefix of the body). Anything LLM-generated will
 * almost certainly NOT match.
 *
 * Run from the repo root with prod env loaded:
 *
 *   # safe scan, prints what would change
 *   npm run regen-summaries
 *
 *   # actually write
 *   npm run regen-summaries -- --apply
 *
 *   # process at most N stories
 *   npm run regen-summaries -- --apply --limit 50
 *
 *   # force regenerate everything (ignore detection)
 *   npm run regen-summaries -- --apply --force
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const SUMMARIZE_PROMPT = `你是一位资深的中文同人小说编辑。给定一篇短篇小说，写一段 60~100 字的中文简介，目的是吸引读者点开阅读。

要求：
1. 不要剧透结局或关键转折
2. 不要直接复述开头第一段，要用编辑视角概括故事钩子
3. 语气与小说本身风格一致（甜文用甜的语气，虐文用揪心的语气）
4. 直接输出简介正文，不要任何前缀（如"简介："）、引号或元描述

只输出简介本身。`;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: ["error"] });
}

const prisma = createPrismaClient();

interface Args {
  apply: boolean;
  force: boolean;
  limit?: number;
  delayMs: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const force = argv.includes("--force");
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
  const delayArg = argv.find((a) => a.startsWith("--delay="));
  const delayMs = delayArg ? parseInt(delayArg.split("=")[1], 10) : 500;
  return { apply, force, limit, delayMs };
}

function isLegacySummary(summary: string | null, content: string): boolean {
  if (!summary) return true;
  const s = summary.trim();
  if (s.length < 30) return true;
  // Legacy: substring(0, 200) ⇒ summary is a prefix of content
  return content.startsWith(s);
}

async function generateSummary(title: string, body: string): Promise<string> {
  const model = new ChatOpenAI({
    temperature: 0.5,
    model: "gpt-4o-mini",
    maxTokens: 200,
  });
  const res = await model.invoke([
    new SystemMessage(SUMMARIZE_PROMPT),
    new HumanMessage(`标题：${title}\n\n正文：\n${body.slice(0, 4000)}`),
  ]);
  const raw = typeof res.content === "string" ? res.content : "";
  const summary = raw.trim().replace(/^["「『]|["」』]$/g, "");
  if (summary.length < 30 || summary.length > 250) {
    throw new Error(`summary length out of range: ${summary.length}`);
  }
  return summary;
}

function fallbackSummary(body: string): string {
  const len = body.length;
  if (len <= 200) return body;
  const start = Math.floor(len / 2);
  return "…" + body.slice(start, start + 180).trim() + "…";
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs();
  console.log(
    `\n[regen-summaries] mode=${args.apply ? "APPLY" : "DRY-RUN"} force=${args.force} limit=${args.limit ?? "∞"} delay=${args.delayMs}ms\n`
  );

  if (!process.env.OPENAI_API_KEY) {
    console.error("✗ OPENAI_API_KEY not set. Use dotenvx to load env, e.g.:");
    console.error(
      "  dotenvx run --env-file=.env.local --env-file=.env -- npm run regen-summaries"
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("✗ DATABASE_URL not set.");
    process.exit(1);
  }

  const stories = await prisma.story.findMany({
    take: args.limit,
    orderBy: { createdAt: "desc" },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
        take: 1,
        select: { content: true, title: true },
      },
    },
  });

  console.log(`Scanned ${stories.length} stor${stories.length === 1 ? "y" : "ies"}.\n`);

  const candidates = stories.filter((s) => {
    const ch = s.chapters[0];
    if (!ch) return false;
    return args.force || isLegacySummary(s.summary, ch.content);
  });

  console.log(
    `Candidates needing regeneration: ${candidates.length} / ${stories.length}\n`
  );

  if (candidates.length === 0) {
    console.log("Nothing to do. ✓");
    return;
  }

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < candidates.length; i++) {
    const s = candidates[i];
    const ch = s.chapters[0]!;
    const prefix = `[${i + 1}/${candidates.length}] ${s.id} 「${s.title}」`;

    if (!args.apply) {
      console.log(`${prefix} would regenerate (current: ${(s.summary ?? "").slice(0, 40)}…)`);
      skipped++;
      continue;
    }

    try {
      const next = await generateSummary(s.title, ch.content);
      await prisma.story.update({
        where: { id: s.id },
        data: { summary: next },
      });
      console.log(`${prefix} ✓ ${next.slice(0, 60)}…`);
      ok++;
    } catch (err) {
      console.warn(`${prefix} ✗ LLM failed (${err instanceof Error ? err.message : err})`);
      try {
        const fb = fallbackSummary(ch.content);
        await prisma.story.update({
          where: { id: s.id },
          data: { summary: fb },
        });
        console.log(`${prefix} ↳ fallback applied`);
        ok++;
      } catch (e2) {
        console.error(`${prefix} ✗✗ DB update failed:`, e2);
        failed++;
      }
    }

    if (i < candidates.length - 1) await sleep(args.delayMs);
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
