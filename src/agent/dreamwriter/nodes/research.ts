import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { getFandomResearch } from "../research";
import { logger } from "../../../lib/logger";

/**
 * Optional research step: fetches a live fandom research brief (Tavily, cached in
 * Postgres) for the parsed CP and stashes it in state for the architect/writer.
 * Intentionally emits no `stage`, so it's transparent to the UI progress stream
 * and never blocks generation when research is unavailable.
 */
export async function researchNode(
  state: DreamWriterState,
  _config: RunnableConfig,
): Promise<Partial<DreamWriterState>> {
  logger.info("dreamwriter.node.start", { node: "research" });
  const brief = await getFandomResearch(state.parsedCP);
  logger.info("dreamwriter.research.done", { hasBrief: brief.length > 0, chars: brief.length });
  return { researchContext: brief };
}
