import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";
import { DreamWriterStateAnnotation } from "./state";
import { intentParserNode } from "./nodes/intent-parser";
import { storyArchitectNode } from "./nodes/story-architect";
import { writerNode } from "./nodes/writer";
import { qualityGuardNode } from "./nodes/quality-guard";
import { summarizeNode } from "./nodes/summarize";
import { deliveryNode } from "./nodes/delivery";
import type { DreamWriterState } from "./state";

const MAX_REVISIONS = 2;

function routeAfterQualityCheck(state: DreamWriterState): string {
  const report = state.qualityReport;
  if (!report) return "summarize_node";
  if (!report.passesThreshold && state.revisionCount < MAX_REVISIONS) {
    console.log(`[DreamWriter] Quality score ${report.overallScore}/10, revision ${state.revisionCount + 1}/${MAX_REVISIONS}`);
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

const memory = new MemorySaver();
export const graph = workflow.compile({ checkpointer: memory });
