import { NextRequest } from "next/server";
import type { CreationProgressEvent, DreamWriterStage } from "@/lib/types/dreamwriter";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:8123";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, language = "zh", showOutline = false } = body as { prompt: string; language?: "zh" | "en"; showOutline?: boolean };
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "请描述你想看的故事" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const threadRes = await fetch(`${LANGGRAPH_URL}/threads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const thread = await threadRes.json();
    const threadId = thread.thread_id;
    const runRes = await fetch(`${LANGGRAPH_URL}/threads/${threadId}/runs/stream`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistant_id: "dreamwriter", input: { messages: [{ role: "human", content: prompt }] }, stream_mode: ["updates"] }),
    });
    if (!runRes.ok || !runRes.body) {
      return new Response(JSON.stringify({ error: "Agent 服务不可用" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    const encoder = new TextEncoder();
    const reader = runRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              const event = parseNodeUpdate(data);
              if (event) { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }
            } catch { /* skip */ }
          }
        } catch (err) {
          const errorEvent: CreationProgressEvent = { stage: "error", error: err instanceof Error ? err.message : "未知错误" };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "创建失败" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

function parseNodeUpdate(data: Record<string, unknown>): CreationProgressEvent | null {
  for (const [nodeName, nodeData] of Object.entries(data)) {
    const update = nodeData as Record<string, unknown>;
    if (!update.stage) continue;
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
