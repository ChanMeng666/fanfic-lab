import { tavily } from "@tavily/core";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { utilityModel } from "./models";
import { getCachedResearch, saveResearch } from "../../lib/research-cache";
import { logger, errorFields } from "../../lib/logger";
import { FANDOM_RAG_NAMESPACE } from "../../lib/fandom";

const FANDOM = "崩坏：星穹铁道 (Honkai: Star Rail)";

interface ResearchPayload {
  brief: string;
}

/**
 * Live fandom research for the requested character pairing, via Tavily web search
 * + an LLM digest, cached in Neon Postgres (SourceResearchCache, 30-day TTL).
 *
 * Returns a concise Chinese research brief, or "" when TAVILY_API_KEY is absent,
 * the CP is empty, or any step fails — callers must treat research as optional
 * (it supplements the curated HSR knowledge pack; it never blocks generation).
 */
export async function getFandomResearch(cp: string[]): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || cp.length === 0) return "";

  const sourceName = `hsr:${cp.join("+")}`;

  // 1) Cache hit?
  try {
    const cached = await getCachedResearch(sourceName);
    const brief = (cached?.data as ResearchPayload | undefined)?.brief;
    if (typeof brief === "string" && brief.length > 0) {
      logger.info("dreamwriter.research.cache_hit", { source: sourceName });
      return brief;
    }
  } catch (e) {
    logger.warn("dreamwriter.research.cache_read_failed", errorFields(e));
  }

  // 2) Tavily search
  let brief = "";
  try {
    const tvly = tavily({ apiKey });
    const query = `${FANDOM} 角色 ${cp.join(" ")} 性格 人物关系 背景设定`;
    const res = await tvly.search(query, { maxResults: 5, searchDepth: "basic" });
    const snippets = (res.results ?? [])
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.content}`)
      .join("\n\n")
      .slice(0, 6000);
    if (!snippets.trim()) return "";

    // 3) Digest into a writing-focused brief
    const model = utilityModel({ temperature: 0.3, maxTokens: 500 });
    const resp = await model.invoke([
      new SystemMessage(
        "你是同人创作的资料整理员。根据网络检索片段，用中文整理一份简洁的角色/关系/设定参考（200字以内），" +
          "聚焦对同人写作有用的要点（性格、说话方式、关系、关键设定）。只整理片段中出现的信息，不要编造。",
      ),
      new HumanMessage(`角色：${cp.join("、")}\n\n检索片段：\n${snippets}`),
    ]);
    brief = typeof resp.content === "string" ? resp.content.trim() : "";
  } catch (e) {
    logger.warn("dreamwriter.research.tavily_failed", errorFields(e));
    return "";
  }

  // 4) Cache the brief (best-effort)
  if (brief) {
    try {
      await saveResearch(sourceName, FANDOM_RAG_NAMESPACE, { brief } satisfies ResearchPayload);
    } catch (e) {
      logger.warn("dreamwriter.research.cache_write_failed", errorFields(e));
    }
  }
  return brief;
}
