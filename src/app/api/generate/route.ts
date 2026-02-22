import { NextRequest } from "next/server";
import type { StoryRequest, PipelineEvent } from "@/lib/types/agent-state";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:8123";
const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (LANGSMITH_API_KEY) headers["x-api-key"] = LANGSMITH_API_KEY;
  return headers;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storyRequest, threadId, action } = body as {
    storyRequest?: StoryRequest;
    threadId?: string;
    action?: "start" | "approve_plan" | "reject_plan";
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: PipelineEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        let activeThreadId = threadId;

        // Create thread if starting fresh
        if (action === "start" || !activeThreadId) {
          const threadRes = await fetch(`${LANGGRAPH_URL}/threads`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({}),
          });
          if (!threadRes.ok) {
            sendEvent({
              stage: "error",
              data: { error: `Failed to create thread: ${threadRes.status}` },
            });
            controller.close();
            return;
          }
          const thread = await threadRes.json();
          activeThreadId = thread.thread_id;
          sendEvent({ stage: "intake", data: { threadId: activeThreadId } });
        }

        // Build run payload
        let input;
        let command;

        if (action === "approve_plan") {
          command = { resume: "approved" };
        } else if (action === "reject_plan") {
          command = { resume: "rejected" };
        } else {
          input = {
            messages: [
              {
                role: "human",
                content: `##PIPELINE##\n${JSON.stringify(storyRequest)}`,
              },
            ],
          };
        }

        const runBody: Record<string, unknown> = {
          assistant_id: "fanfic_agent",
          stream_mode: ["updates"],
        };
        if (input) runBody.input = input;
        if (command) runBody.command = command;

        const runRes = await fetch(
          `${LANGGRAPH_URL}/threads/${activeThreadId}/runs/stream`,
          {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify(runBody),
          }
        );

        if (!runRes.ok || !runRes.body) {
          sendEvent({
            stage: "error",
            data: { error: `Agent error: ${runRes.status}` },
          });
          controller.close();
          return;
        }

        // Parse SSE stream from LangGraph
        const reader = runRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const event = JSON.parse(dataStr);
              // Extract pipeline state updates from LangGraph events
              // LangGraph sends updates per node: { node_name: { field: value } }
              for (const [, updates] of Object.entries(event)) {
                const nodeUpdates = updates as Record<string, unknown>;

                if (nodeUpdates.pipelineStage) {
                  const pipelineEvent: PipelineEvent = {
                    stage: nodeUpdates.pipelineStage as PipelineEvent["stage"],
                    data: {},
                  };

                  if (nodeUpdates.researchData) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pipelineEvent.data!.researchData = nodeUpdates.researchData as any;
                  }
                  if (nodeUpdates.writingPlan) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pipelineEvent.data!.plan = nodeUpdates.writingPlan as any;
                  }
                  if (nodeUpdates.deliverable) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    pipelineEvent.data!.deliverable = nodeUpdates.deliverable as any;
                  }
                  if (nodeUpdates.pipelineStage === "hitl_wait") {
                    pipelineEvent.data!.threadId = activeThreadId;
                  }
                  if (typeof nodeUpdates.progress === "string") {
                    pipelineEvent.data!.progress = nodeUpdates.progress;
                  }

                  sendEvent(pipelineEvent);
                }
              }
            } catch {
              // Skip unparseable lines
            }
          }
        }

        // Send final complete event
        sendEvent({ stage: "complete", data: { threadId: activeThreadId } });
      } catch (error) {
        sendEvent({
          stage: "error",
          data: {
            error:
              error instanceof Error ? error.message : "Unknown error",
          },
        });
      } finally {
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
}
