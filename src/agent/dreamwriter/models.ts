import { ChatOpenAI } from "@langchain/openai";

/**
 * Central model factory + routing for the DreamWriter pipeline.
 *
 * Every node gets its model from HERE instead of `new ChatOpenAI(...)`, so the
 * routing decisions (which OpenAI tier for which job) live in one place and can
 * be re-pointed via env with zero code changes.
 *
 * As of 2026-06 OpenAI's lineup is the GPT-5 family (gpt-4o is legacy). We route
 * by job rather than running everything on one model:
 *   - creative prose (writer / scene / polish) -> gpt-5.4  (warm, strong 文笔)
 *   - structure / planning (architect)          -> gpt-5.4  (reasoning-capable)
 *   - quality critique (critic)                 -> gpt-5.4  (MUST be >= writer)
 *   - cheap structured tasks (intent/summary/   -> gpt-5.4-mini
 *     suggestions/research digest)
 *
 * The critic deliberately runs on a frontier model, not a mini one: a reviewer
 * weaker than the writer it judges caps the quality it can detect.
 *
 * Override any id via env without touching code:
 *   DW_WRITER_MODEL, DW_ARCHITECT_MODEL, DW_CRITIC_MODEL, DW_POLISH_MODEL, DW_UTILITY_MODEL
 * Verify ids against https://developers.openai.com/api/docs/models when bumping.
 */
const MODEL_IDS = {
  writer: process.env.DW_WRITER_MODEL || "gpt-5.4",
  architect: process.env.DW_ARCHITECT_MODEL || "gpt-5.4",
  critic: process.env.DW_CRITIC_MODEL || "gpt-5.4",
  polish: process.env.DW_POLISH_MODEL || "gpt-5.4",
  utility: process.env.DW_UTILITY_MODEL || "gpt-5.4-mini",
} as const;

/**
 * Repo-controlled reliability policy for every LLM call. A per-call `timeout`
 * stops one hung request from eating the whole 300s route budget; `maxRetries`
 * lets the OpenAI SDK retry transient 429/5xx with exponential backoff. Tune via
 * env without code changes.
 */
const LLM_TIMEOUT_MS = Number(process.env.DW_LLM_TIMEOUT_MS) || 90_000;
const LLM_MAX_RETRIES = Number.isFinite(Number(process.env.DW_LLM_MAX_RETRIES))
  ? Number(process.env.DW_LLM_MAX_RETRIES)
  : 2;
const RELIABILITY = { timeout: LLM_TIMEOUT_MS, maxRetries: LLM_MAX_RETRIES } as const;

/** Scene prose: highest creativity. Raw text out (callers do NOT bind a schema). */
export function writerModel(): ChatOpenAI {
  return new ChatOpenAI({ model: MODEL_IDS.writer, temperature: 0.9, ...RELIABILITY });
}

/** Outline + beat planning: structure-as-reasoning, lower temperature. */
export function architectModel(): ChatOpenAI {
  return new ChatOpenAI({ model: MODEL_IDS.architect, temperature: 0.7, ...RELIABILITY });
}

/** Quality critique: strong model (>= writer), deterministic. */
export function criticModel(): ChatOpenAI {
  return new ChatOpenAI({ model: MODEL_IDS.critic, temperature: 0.3, ...RELIABILITY });
}

/** Final full-text polish / de-AI-flavor pass. */
export function polishModel(): ChatOpenAI {
  return new ChatOpenAI({ model: MODEL_IDS.polish, temperature: 0.6, ...RELIABILITY });
}

/**
 * Cheap structured / utility tasks (intent parse, summary, suggestions, research
 * digest). Temperature + maxTokens vary per caller, so they're parameterized.
 */
export function utilityModel(opts?: { temperature?: number; maxTokens?: number }): ChatOpenAI {
  return new ChatOpenAI({
    model: MODEL_IDS.utility,
    temperature: opts?.temperature ?? 0.3,
    ...RELIABILITY,
    ...(opts?.maxTokens ? { maxTokens: opts.maxTokens } : {}),
  });
}
