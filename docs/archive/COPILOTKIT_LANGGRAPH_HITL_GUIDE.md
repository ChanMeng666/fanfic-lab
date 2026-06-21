# CopilotKit + LangGraph.js HITL Integration Guide

## Overview

This document summarizes our experience integrating **CopilotKit** with **LangGraph.js** for Human-in-the-Loop (HITL) workflows. It covers critical bugs, failed approaches, and the final working solution.

**Tech Stack:**
- Frontend: Next.js 16, React 19, CopilotKit 1.x
- AI Runtime: CopilotKit SDK
- AI Agent: LangGraph.js 1.0
- Deployment: Railway (frontend + agent via private network)

---

## The Problem

When implementing HITL approval flows (e.g., user approves AI-generated content before proceeding), we encountered a critical incompatibility between CopilotKit and LangGraph.js.

### Symptom
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["toolCallId"],
    "message": "Required"
  }
]
```

### Root Cause
**Field naming mismatch between LangGraph.js and CopilotKit:**

| Framework | Field Name | Format |
|-----------|-----------|--------|
| LangGraph.js / OpenAI | `tool_call_id` | snake_case |
| CopilotKit | `toolCallId` | camelCase |

When LangGraph.js creates a `ToolMessage`, it uses `tool_call_id`. When CopilotKit tries to parse the message, it expects `toolCallId` and fails with ZodError.

---

## Failed Approaches

### Approach 1: Add `toolCallId` dynamically

```typescript
const toolMessage = new ToolMessage({
  content: result,
  name: toolName,
  tool_call_id: toolCall.id!,
});
// Try to add CopilotKit-compatible field
(toolMessage as any).toolCallId = toolCall.id!;
```

**Result: FAILED**

LangChain's serialization mechanism ignores dynamically added properties. When the message is serialized for storage/transmission, only declared class fields are included.

### Approach 2: Use `emitMessages: false`

```typescript
const customConfig = copilotkitCustomizeConfig(config, {
  emitMessages: false  // Don't emit ToolMessage to frontend
});
```

**Result: FAILED**

`emitMessages: false` only prevents messages from being streamed during execution. The ToolMessage is still stored in LangGraph's checkpointer and returned when CopilotKit fetches the state later.

### Approach 3: Route back to chatNode after tool execution

```typescript
function routeAfterTool(state) {
  if (toolCall.name === "generate_outline") {
    return "chat_node";  // Generate AIMessage to "consume" ToolMessage
  }
  return END;
}
```

**Result: FAILED**

The ToolMessage still exists in the conversation history. When CopilotKit reconstructs the history for subsequent requests, it parses all messages including the ToolMessage → ZodError.

### Approach 4: State-only approach (no messages)

```typescript
// Don't add any messages, only emit state
if (toolName === "generate_outline") {
  pendingContent = { type: "outline", content: result };
  // NO resultMessages.push() - avoid ToolMessage entirely
}
await copilotkitEmitState(config, { ...state, pendingContent });
return { pendingContent };  // No messages
```

**Result: FAILED**

OpenAI's API requires that every `tool_call` must have a corresponding `ToolMessage` response. Without the ToolMessage, subsequent API calls fail:

```
Error: 400 An assistant message with 'tool_calls' must be followed by
tool messages responding to each 'tool_call_id'.
```

---

## The Working Solution: Dedicated Graph Node

The solution is to **completely bypass tool calling** for HITL operations by using a **dedicated graph node** instead of a tool.

### Architecture Comparison

**Before (Tool-based - BROKEN):**
```
User Request → chatNode → LLM calls tool → toolNode → ToolMessage → ZodError
```

**After (Node-based - WORKS):**
```
User Request → routeFromStart → isOutlineRequest? → outline_node → AIMessage → Success
```

### Implementation

#### 1. Create a detection function

```typescript
function isOutlineRequest(state: FanficAgentState): boolean {
  // Check if we're in the outline step
  const context = extractContextFromReadable(state);
  const currentStep = state.wizardSession?.step || context?.step;

  if (currentStep !== "outline") {
    return false;
  }

  // Check if the message contains outline-related keywords
  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage || lastMessage._getType() !== "human") {
    return false;
  }

  const content = typeof lastMessage.content === "string"
    ? lastMessage.content.toLowerCase()
    : "";

  const outlinePatterns = [
    /write|create|make|generate|outline|story/i,
    /romance|adventure|action|drama/i,
  ];

  return outlinePatterns.some(p => p.test(content));
}
```

#### 2. Create a dedicated node

```typescript
async function outlineNode(
  state: FanficAgentState,
  config: RunnableConfig
): Promise<Partial<FanficAgentState>> {
  // Extract context from CopilotKit readable state
  const context = extractContextFromReadable(state);
  const sourceName = context?.sourceName || "Unknown";
  const characters = context?.characters || [];

  // Generate outline directly with LLM (no tool calling)
  const model = new ChatOpenAI({ model: "gpt-4o-mini" });
  const response = await model.invoke([
    new SystemMessage(buildOutlinePrompt(sourceName, characters)),
    new HumanMessage(userRequest),
  ]);

  const outlineContent = response.content as string;

  // Set pendingContent for HITL - frontend will detect this
  const pendingContent = {
    type: "outline" as const,
    content: outlineContent,
  };

  // Emit state for frontend HITL detection
  await copilotkitEmitState(config, { ...state, pendingContent });

  // Return AIMessage (NOT ToolMessage) - CopilotKit compatible
  return {
    messages: [new AIMessage({
      content: "I've created your story outline! Please review it above.",
    })],
    pendingContent,
  };
}
```

#### 3. Update routing from START

```typescript
function routeFromStart(state: FanficAgentState): string {
  // Check for research request first
  if (isResearchRequest(state)) {
    return "research_node";
  }

  // Check for outline request
  if (isOutlineRequest(state)) {
    return "outline_node";  // Skip chat_node entirely
  }

  // Default to chat node
  return "chat_node";
}
```

#### 4. Add node to graph

```typescript
const workflow = new StateGraph(FanficAgentStateAnnotation)
  .addNode("chat_node", chatNode)
  .addNode("tool_node", toolNode)
  .addNode("research_node", researchNode)
  .addNode("outline_node", outlineNode)  // NEW
  .addConditionalEdges(START, routeFromStart)
  .addConditionalEdges("chat_node", routeAfterChat)
  .addConditionalEdges("tool_node", routeAfterTool)
  .addConditionalEdges("research_node", routeAfterResearch)
  .addConditionalEdges("outline_node", routeAfterOutline);  // NEW
```

#### 5. Remove tool from available tools

```typescript
// tools/index.ts
// Exclude generateOutlineTool - handled by outline_node
export const allBackendTools = [
  continueStoryTool,
  expandSceneTool,
  polishProseTool,
  ...characterTools,
  ...imageTools,
  // generateOutlineTool - REMOVED
];
```

#### 6. Frontend: Detect pendingContent with useCoAgentStateRender

```typescript
// wizard/page.tsx
useCoAgentStateRender<{
  pendingContent?: { type: string; content: string } | null;
}>({
  name: "fanfic_agent",
  render: ({ state }) => {
    if (state?.pendingContent?.type === "outline" && state.pendingContent.content) {
      return (
        <OutlineApprovalCard
          outline={state.pendingContent.content}
          onApprove={() => handleOutlineApproved(state.pendingContent!.content)}
          onReject={(feedback) => console.log("Rejected:", feedback)}
          onEdit={(editedOutline) => handleOutlineApproved(editedOutline)}
        />
      );
    }
    return null;
  },
});
```

---

## Key Takeaways

### 1. Avoid ToolMessage for HITL Operations

**Rule:** If an operation requires human approval before proceeding, do NOT implement it as a tool. Use a dedicated graph node instead.

**Why:** ToolMessage format is incompatible between LangGraph.js and CopilotKit. This is a known bug (see CopilotKit issue #2897).

### 2. Use State Emission for HITL Detection

Instead of relying on CopilotKit actions (`useCopilotAction` with `renderAndWaitForResponse`), use:
- `copilotkitEmitState()` on the backend to emit state with `pendingContent`
- `useCoAgentStateRender()` on the frontend to detect and render HITL UI

### 3. Pattern for Dedicated Nodes

When creating a dedicated node for HITL operations:

```typescript
async function myHITLNode(state, config) {
  // 1. Extract context from CopilotKit readable state
  const context = extractContextFromReadable(state);

  // 2. Perform the operation directly (no tool calling)
  const result = await performOperation(context);

  // 3. Set pendingContent for frontend detection
  const pendingContent = { type: "myType", content: result };

  // 4. Emit state to frontend
  await copilotkitEmitState(config, { ...state, pendingContent });

  // 5. Return AIMessage (not ToolMessage)
  return {
    messages: [new AIMessage({ content: "Please review above." })],
    pendingContent,
  };
}
```

### 4. CopilotKit Readable Context Format

CopilotKit's `useCopilotReadable` stringifies values with `JSON.stringify()`. On the backend, you must parse them:

```typescript
function extractContextFromReadable(state) {
  const copilotState = state.copilotkit;

  if (copilotState?.context?.length > 0) {
    const contextItem = copilotState.context[0];

    // Value is a JSON string, not an object
    if (typeof contextItem.value === "string") {
      try {
        return JSON.parse(contextItem.value);
      } catch {
        return null;
      }
    }
  }
  return null;
}
```

### 5. Graph Routing Pattern

For HITL operations, route from START directly to the dedicated node:

```typescript
function routeFromStart(state) {
  if (isResearchRequest(state)) return "research_node";
  if (isOutlineRequest(state)) return "outline_node";
  if (isImageRequest(state)) return "image_node";
  return "chat_node";  // Default for regular conversation
}
```

---

## Summary Table

| Operation Type | Implementation | Message Type | HITL Detection |
|---------------|----------------|--------------|----------------|
| Regular chat | `chat_node` | AIMessage | N/A |
| Tool execution | `tool_node` | ToolMessage | ❌ Avoid for HITL |
| Research | `research_node` | AIMessage | `useCoAgentStateRender` |
| Outline | `outline_node` | AIMessage | `useCoAgentStateRender` |
| Image generation | `image_node` | AIMessage | `useCoAgentStateRender` |

---

## Related Issues

- CopilotKit Issue #2897: ToolMessage format mismatch with LangGraph.js
- LangChain serialization: Dynamic properties are ignored

---

## Files Modified in This Solution

| File | Purpose |
|------|---------|
| `src/agent/agent.ts` | Add `isOutlineRequest()`, `outlineNode()`, update routing |
| `src/agent/tools/index.ts` | Remove `generateOutlineTool` from exports |
| `src/app/(main)/(protected)/wizard/page.tsx` | Add `useCoAgentStateRender` for HITL |
| `src/components/hitl/OutlineApprovalCard.tsx` | HITL approval UI component |

---

## Conclusion

The CopilotKit + LangGraph.js integration has a critical ToolMessage format incompatibility. The solution is to **avoid ToolMessage entirely** for HITL operations by using dedicated graph nodes that:

1. Route directly from START (bypass chat_node)
2. Perform operations with direct LLM calls (no tool calling)
3. Emit state with `pendingContent` for frontend detection
4. Return AIMessage (not ToolMessage)

This pattern has been successfully tested and deployed in production.
