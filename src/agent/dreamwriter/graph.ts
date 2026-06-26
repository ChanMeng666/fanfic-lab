import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import { DreamWriterStateAnnotation } from "./state";
import { intentParserNode } from "./nodes/intent-parser";
import { researchNode } from "./nodes/research";
import { storyArchitectNode } from "./nodes/story-architect";
import { sceneWriterNode } from "./nodes/scene-writer";
import { qualityGuardNode } from "./nodes/quality-guard";
import { targetedRevisionNode } from "./nodes/targeted-revision";
import { polishNode } from "./nodes/polish";
import { summarizeNode } from "./nodes/summarize";
import { deliveryNode } from "./nodes/delivery";
import { logger } from "../../lib/logger";
import type { DreamWriterState } from "./state";

const MAX_REVISIONS = 2;

/**
 * After quality check: if the draft misses the bar AND the critic flagged
 * specific scenes AND we have revisions left, do a surgical targeted revision.
 * Otherwise advance to polish (no flagged scenes = nothing to target).
 */
function routeAfterQualityCheck(state: DreamWriterState): string {
  const report = state.qualityReport;
  if (!report) return "polish_node";
  const canRevise = !report.passesThreshold && state.revisionCount < MAX_REVISIONS && report.flaggedScenes.length > 0;
  if (canRevise) {
    logger.info("dreamwriter.revision", { score: report.overallScore, revision: state.revisionCount + 1, maxRevisions: MAX_REVISIONS, flagged: report.flaggedScenes.length });
    return "targeted_revision_node";
  }
  return "polish_node";
}

const workflow = new StateGraph(DreamWriterStateAnnotation)
  .addNode("intent_parser_node", intentParserNode)
  .addNode("research_node", researchNode)
  .addNode("story_architect_node", storyArchitectNode)
  .addNode("scene_writer_node", sceneWriterNode)
  .addNode("quality_guard_node", qualityGuardNode)
  .addNode("targeted_revision_node", targetedRevisionNode)
  .addNode("polish_node", polishNode)
  .addNode("summarize_node", summarizeNode)
  .addNode("delivery_node", deliveryNode)
  .addEdge(START, "intent_parser_node")
  .addEdge("intent_parser_node", "research_node")
  .addEdge("research_node", "story_architect_node")
  .addEdge("story_architect_node", "scene_writer_node")
  .addEdge("scene_writer_node", "quality_guard_node")
  .addConditionalEdges("quality_guard_node", routeAfterQualityCheck, { targeted_revision_node: "targeted_revision_node", polish_node: "polish_node" })
  .addEdge("targeted_revision_node", "quality_guard_node")
  .addEdge("polish_node", "summarize_node")
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
