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
    let threadRes;
    try {
      threadRes = await fetch(`${LANGGRAPH_URL}/threads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    } catch (fetchErr) {
      console.error("[create] Thread creation fetch failed:", fetchErr);
      return new Response(JSON.stringify({ error: `Agent 连接失败: ${fetchErr instanceof Error ? fetchErr.message : "unknown"}`, url: LANGGRAPH_URL }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    if (!threadRes.ok) {
      console.error("[create] Thread creation failed:", threadRes.status);
      return new Response(JSON.stringify({ error: `Thread 创建失败: ${threadRes.status}` }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    const thread = await threadRes.json();
    const threadId = thread.thread_id;
    console.log("[create] Thread created:", threadId, "URL:", LANGGRAPH_URL);
    const runRes = await fetch(`${LANGGRAPH_URL}/threads/${threadId}/runs/stream`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistant_id: "dreamwriter", input: { messages: [{ role: "human", content: prompt }] }, stream_mode: ["updates"] }),
    });
    if (!runRes.ok || !runRes.body) {
      console.error("[create] Run stream failed:", runRes.status);
      return new Response(JSON.stringify({ error: `Agent 运行失败: ${runRes.status}` }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    const encoder = new TextEncoder();
    const reader = runRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEventType = "";
    let dataLines: string[] = [];
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEventType = line.slice(7).trim();
              continue;
            }
            if (line.startsWith("data: ")) {
              dataLines.push(line.slice(6));
              continue;
            }
            if (line.startsWith("id: ") || line.trim() === "") {
              // End of SSE event — process accumulated data lines
              if (dataLines.length === 0) continue;
              const jsonStr = dataLines.join("\n").trim();
              dataLines = [];
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const data = JSON.parse(jsonStr);
                if (currentEventType === "error" || data.error) {
                  const errorEvent: CreationProgressEvent = {
                    stage: "error",
                    error: data.message || data.error || "Agent 执行出错",
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
                  controller.close();
                  return;
                }
                if (currentEventType === "updates") {
                  const event = parseNodeUpdate(data);
                  if (event) { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }
                }
              } catch { /* skip unparseable */ }
              currentEventType = "";
            }
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
