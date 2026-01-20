import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";
import { NextRequest } from "next/server";

// Initialize the OpenAI adapter for fallback/suggestions
const serviceAdapter = new OpenAIAdapter({
  model: "gpt-4o",
});

// LangGraph agent URL
// - Local development: http://127.0.0.1:8123
// - Railway production: Uses private networking (agent.railway.internal:8123)
const LANGGRAPH_URL =
  process.env.LANGGRAPH_URL || "http://127.0.0.1:8123";

// LangSmith API key for LangGraph Platform authentication
const LANGSMITH_API_KEY = process.env.LANGSMITH_API_KEY;

// Create the CopilotKit runtime with LangGraph agent
const runtime = new CopilotRuntime({
  agents: {
    fanfic_agent: new LangGraphAgent({
      deploymentUrl: LANGGRAPH_URL,
      graphId: "fanfic_agent",
      langsmithApiKey: LANGSMITH_API_KEY,
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
