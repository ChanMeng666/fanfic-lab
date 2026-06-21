import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { HumanMessage } from "@langchain/core/messages";
import { getGraph } from "@/agent/dreamwriter/graph";
import type { CreationProgressEvent, DreamWriterStage } from "@/lib/types/dreamwriter";
import { checkCanGenerate } from "@/lib/actions/credits";
import { CREDIT_COSTS, type StoryLength } from "@/lib/billing/pricing";

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
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "请描述你想看的故事" }), {
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

    const threadId = randomUUID();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const graph = await getGraph();
          const updates = await graph.stream(
            { messages: [new HumanMessage(prompt)] },
            { configurable: { thread_id: threadId }, streamMode: "updates" },
          );
          for await (const chunk of updates) {
            const event = parseNodeUpdate(chunk as Record<string, unknown>);
            if (event) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
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
