import { NextResponse } from "next/server";

/**
 * Debug endpoint to test LangGraph agent connectivity
 * GET /api/debug-agent
 */
export async function GET() {
  const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:8123";

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: {
      LANGGRAPH_URL,
      NODE_ENV: process.env.NODE_ENV,
      hasLangSmithKey: !!process.env.LANGSMITH_API_KEY,
    },
    tests: {},
  };

  // Test 1: Check if the base URL is reachable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${LANGGRAPH_URL}/info`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    results.tests = {
      ...results.tests as object,
      infoEndpoint: {
        status: "success",
        httpStatus: response.status,
        statusText: response.statusText,
      },
    };

    if (response.ok) {
      try {
        const data = await response.json();
        (results.tests as Record<string, unknown>).infoEndpoint = {
          ...(results.tests as Record<string, unknown>).infoEndpoint as object,
          data,
        };
      } catch {
        // Response wasn't JSON
      }
    }
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      infoEndpoint: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : "Unknown",
      },
    };
  }

  // Test 2: Check assistants endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${LANGGRAPH_URL}/assistants/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph_id: "fanfic_agent" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    results.tests = {
      ...results.tests as object,
      assistantsEndpoint: {
        status: "success",
        httpStatus: response.status,
        statusText: response.statusText,
      },
    };

    if (response.ok) {
      try {
        const data = await response.json();
        (results.tests as Record<string, unknown>).assistantsEndpoint = {
          ...(results.tests as Record<string, unknown>).assistantsEndpoint as object,
          assistantCount: Array.isArray(data) ? data.length : "not array",
        };
      } catch {
        // Response wasn't JSON
      }
    }
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      assistantsEndpoint: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : "Unknown",
      },
    };
  }

  // Determine overall status
  const testResults = results.tests as Record<string, { status: string }>;
  const allTestsPassed = Object.values(testResults).every(
    (test) => test.status === "success"
  );

  return NextResponse.json({
    ...results,
    overallStatus: allTestsPassed ? "healthy" : "unhealthy",
  }, {
    status: allTestsPassed ? 200 : 503,
  });
}
