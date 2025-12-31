import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

// Initialize the OpenAI adapter for fallback/suggestions
const serviceAdapter = new OpenAIAdapter({
  model: "gpt-4o",
});

// LangGraph agent URL - local dev or production
const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://localhost:8123";

// Create the CopilotKit runtime with LangGraph agent
const runtime = new CopilotRuntime({
  agents: {
    fanfic_agent: new LangGraphHttpAgent({
      url: `${LANGGRAPH_URL}/agents/fanfic_agent`,
    }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
