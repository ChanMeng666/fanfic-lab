import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { DreamWriterStateAnnotation } from "./state";
import { intentParserNode } from "./nodes/intent-parser";
import { storyArchitectNode } from "./nodes/story-architect";
import { writerNode } from "./nodes/writer";
import { qualityGuardNode } from "./nodes/quality-guard";
import { summarizeNode } from "./nodes/summarize";
import { deliveryNode } from "./nodes/delivery";
import { logger } from "../../lib/logger";
import type { DreamWriterState } from "./state";

const MAX_REVISIONS = 2;

function routeAfterQualityCheck(state: DreamWriterState): string {
  const report = state.qualityReport;
  if (!report) return "summarize_node";
  if (!report.passesThreshold && state.revisionCount < MAX_REVISIONS) {
    logger.info("dreamwriter.revision", { score: report.overallScore, revision: state.revisionCount + 1, maxRevisions: MAX_REVISIONS });
    return "writer_node";
  }
  return "summarize_node";
}

async function revisionCounterNode(state: DreamWriterState): Promise<Partial<DreamWriterState>> {
  return { revisionCount: state.revisionCount + 1, stage: "revising", logs: [{ message: `正在根据反馈修改第 ${state.revisionCount + 1} 版...`, done: true }] };
}

const workflow = new StateGraph(DreamWriterStateAnnotation)
  .addNode("intent_parser_node", intentParserNode)
  .addNode("story_architect_node", storyArchitectNode)
  .addNode("writer_node", writerNode)
  .addNode("quality_guard_node", qualityGuardNode)
  .addNode("revision_counter_node", revisionCounterNode)
  .addNode("summarize_node", summarizeNode)
  .addNode("delivery_node", deliveryNode)
  .addEdge(START, "intent_parser_node")
  .addEdge("intent_parser_node", "story_architect_node")
  .addEdge("story_architect_node", "writer_node")
  .addEdge("writer_node", "quality_guard_node")
  .addConditionalEdges("quality_guard_node", routeAfterQualityCheck, { writer_node: "revision_counter_node", summarize_node: "summarize_node" })
  .addEdge("revision_counter_node", "writer_node")
  .addEdge("summarize_node", "delivery_node")
  .addEdge("delivery_node", END);

/**
 * In-memory compiled graph. Used ONLY by the local LangGraph Studio dev server
 * (`npm run dev:studio`, referenced by langgraph.json). Production uses getGraph().
 */
export const graph = workflow.compile({ checkpointer: new MemorySaver() });

// --- Production (in-process) graph with a durable Postgres checkpointer ---
// Lazily built and memoized so importing this module has no DB side effects, and
// table setup runs at most once per process. The checkpointer uses a DIRECT
// (unpooled) connection because it relies on prepared statements / transactions,
// which Neon's pooled endpoint (pgbouncer) does not support reliably.
let graphPromise: ReturnType<typeof buildGraphWithPostgres> | null = null;

async function buildGraphWithPostgres() {
  const connString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connString) throw new Error("DATABASE_URL(_UNPOOLED) is required for the DreamWriter checkpointer");
  const checkpointer: BaseCheckpointSaver = PostgresSaver.fromConnString(connString);
  // Idempotent: CREATE TABLE IF NOT EXISTS for the LangGraph checkpoint tables only.
  await (checkpointer as PostgresSaver).setup();
  return workflow.compile({ checkpointer });
}

export function getGraph() {
  if (!graphPromise) graphPromise = buildGraphWithPostgres();
  return graphPromise;
}
