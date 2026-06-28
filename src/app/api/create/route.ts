import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { HumanMessage } from "@langchain/core/messages";
import { getGraph } from "@/agent/dreamwriter/graph";
import type { CreationProgressEvent, DreamWriterStage, InputIntent } from "@/lib/types/dreamwriter";
import { checkCanGenerate } from "@/lib/actions/credits";
import { CREDIT_COSTS, type StoryLength } from "@/lib/billing/pricing";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { logger, errorFields } from "@/lib/logger";

// Build the structured InputIntent from the request body, or null for the pure
// free-text flow. Only treated as structured when at least one CP slot is set.
function buildInputIntent(body: Record<string, unknown>): InputIntent | null {
  const cp = Array.isArray(body.cp) ? (body.cp as unknown[]).map(String).filter((s) => s.trim()) : [];
  if (cp.length === 0) return null;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return {
    cp,
    setting: str(body.setting),
    tone: str(body.tone),
    pov: str(body.pov),
    ending: str(body.ending),
    rating: str(body.rating),
    avoid: Array.isArray(body.avoid) ? (body.avoid as unknown[]).map(String).filter((s) => s.trim()) : undefined,
    mustInclude: str(body.mustInclude),
    freeText: str(body.prompt),
  };
}

// The DreamWriter agent runs in-process (no separate LangGraph server). This route
// must use the Node.js runtime because the graph pulls in OpenAI, Prisma + pgvector,
// and the knowledge pack.
export const runtime = "nodejs";
// Story generation (with up to 2 revision loops) can run for several minutes.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body as { prompt: string; language?: "zh" | "en"; showOutline?: boolean };
    const length: StoryLength =
      typeof body?.length === "string" && body.length in CREDIT_COSTS
        ? (body.length as StoryLength)
        : "short";
    const inputIntent = buildInputIntent(body as Record<string, unknown>);
    // Accept either free-text prompt OR structured input (a chosen CP is enough).
    if (!prompt?.trim() && !inputIntent) {
      return new Response(JSON.stringify({ error: "请描述你想看的故事，或选择角色与基调" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Credit gate (server-side, defense-in-depth — the UI also pre-checks). The
    // gate resolves the session user; treat a missing user as unauthenticated.
    let gate: Awaited<ReturnType<typeof checkCanGenerate>>;
    try {
      gate = await checkCanGenerate(length);
    } catch {
      return new Response(JSON.stringify({ error: "请先登录后再创作" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!gate.canGenerate) {
      return new Response(
        JSON.stringify({ error: "额度不足，请充值后再试", code: "INSUFFICIENT_CREDITS" }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }

    // Resolve the DB user so we can persist the authoritative Generation server-side
    // (the gate already proved the session is valid).
    const stackUser = await stackServerApp.getUser();
    const dbUser = stackUser
      ? await prisma.user.findUnique({ where: { stackAuthId: stackUser.id }, select: { id: true } })
      : null;
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "请先登录后再创作" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const userId = dbUser.id;

    const threadId = randomUUID();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const graph = await getGraph();
          // A non-empty message is always required; fall back to a composed line
          // when the user gave only structured input and no free text.
          const seedText = prompt?.trim() || (inputIntent ? `${inputIntent.cp?.join(" × ")} ${inputIntent.tone ?? ""}`.trim() : "");
          const updates = await graph.stream(
            { messages: [new HumanMessage(seedText)], inputIntent, requestedLength: length },
            { configurable: { thread_id: threadId }, streamMode: "updates" },
          );
          for await (const chunk of updates) {
            const event = parseNodeUpdate(chunk as Record<string, unknown>);
            if (!event) continue;
            // When the agent delivers the finished story, persist it server-side as
            // the AUTHORITATIVE record. The client receives only the generationId and
            // hands THAT back to /api/stories — it can no longer forge the content,
            // word count, or paid length that billing is computed from.
            if (event.result) {
              try {
                const generation = await prisma.generation.create({
                  data: {
                    userId,
                    type: "STORY",
                    status: "COMPLETE",
                    request: { prompt: seedText, language: event.result.language, length } as object,
                    deliverable: event.result as object,
                    wordCount: event.result.wordCount,
                    completedAt: new Date(),
                  },
                  select: { id: true },
                });
                event.generationId = generation.id;
              } catch (e) {
                logger.error("create.generation.persist_failed", { userId, ...errorFields(e) });
                // Surface as an error event rather than letting the client try to
                // save unbacked content (which the save route would now reject).
                const errorEvent: CreationProgressEvent = { stage: "error", error: "保存生成记录失败，请重试" };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
                controller.close();
                return;
              }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
          controller.close();
        } catch (err) {
          const errorEvent: CreationProgressEvent = {
            stage: "error",
            error: err instanceof Error ? err.message : "未知错误",
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "创建失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// In "updates" stream mode each chunk is { [nodeName]: partialStateUpdate }.
function parseNodeUpdate(data: Record<string, unknown>): CreationProgressEvent | null {
  for (const [, nodeData] of Object.entries(data)) {
    const update = nodeData as Record<string, unknown>;
    if (!update?.stage) continue;
    const stage = update.stage as DreamWriterStage;
    const logs = update.logs as { message: string; done: boolean }[] | undefined;
    const message = logs?.[0]?.message;
    const event: CreationProgressEvent = { stage, message };
    if (update.outline) event.outline = update.outline as CreationProgressEvent["outline"];
    if (update.result) event.result = update.result as CreationProgressEvent["result"];
    return event;
  }
  return null;
}
