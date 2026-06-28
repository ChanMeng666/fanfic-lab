# Architecture & Quality Review — Decisions & Roadmap (June 2026)

> Joint **Claude Code × Codex CLI** adversarial review. Two AI reviewers independently
> audited the project, challenged each other's findings, and the severe claims were
> re-verified against the code. This is the resulting decision record + roadmap.

## Why this review happened

FanFic Lab had grown a large surface (autonomous DreamWriter agent + a full community
layer) with no automated tests and several conventions applied unevenly. The goal was a
hard look at **correctness, UX, the continuous-update flow, agent architecture,
extensibility, maintainability, and performance** — and a prioritized plan to fix what matters.

## Method

- 3 Claude `Explore` agents mapped the agent pipeline, the UX/user-flows, and the data layer.
- Codex (`codex exec`, read-only) independently reviewed the same axes and was handed Claude's
  claims to challenge — agree / disagree / what was missed.
- Where the reviewers disagreed or a claim was severe, the code was re-read to adjudicate.

## Cross-verified findings (severity-ranked)

| # | Finding | Severity |
|---|---------|----------|
| 1 | **Forgeable story-save + billing.** `/api/stories` trusted a client-posted `result` and `length` → publish without paying / bill the wrong (free) price. | CRITICAL |
| 2 | **Billing doc/code drift; non-transactional; balances could go negative.** Docs said deduction was off; code deducted in 3 non-atomic writes, `create:{balance:-cost}` allowed negatives. | CRITICAL |
| 3 | **Quality-guard failed open** — a crashed critic returned `passesThreshold:true`. | High |
| 4 | **Scene-writer dropped failed scenes silently**; one embedding/RAG call per scene; fully sequential. | High |
| 5 | **Continuation/poll/branch persistence race-prone** (separate writes; poll settle could double-generate). | High |
| 6 | **Continuation is a second-class generator** (single `gpt-4o` call, no quality-guard/polish; cost not disclosed before charging). | Medium |
| 7 | **No app-level LLM timeout/retry policy.** | Medium |
| 8 | **Streaming is node-level only** — stage labels for a 30–60s+ wait, no live prose, no cancel on the create page. | Medium |
| 9 | **Inconsistent route validation; no automated test suite.** | Medium |
| 10 | **HSR + OpenAI hardcoded across product + infra** (extensibility). | Medium |

**Debate resolved:** continuations will NOT route through the full DreamWriter graph (cost/latency/
over-planning a single chapter). Decision = a **shared generation core with mode-specific pipelines**.

**Codex corrections folded in:** "no validation" / "buried affordance" / "no retries anywhere" were
overstated; a full plugin system is over-architecture — a **config boundary** solves most
fandom/model extensibility.

## Roadmap

**Phase 0 — billing & generation integrity (DONE):** server-authoritative generation
(`/api/create` persists the finished `Generation`; `/api/stories` saves+bills from that record,
not client input); transactional, non-negative, single-transaction charging; quality-guard
fails *closed*; scene-writer retries + asserts completeness + fails visibly; billing docs
reconciled.

**Phase 1 — reliability & continuation refactor:** shared generation core + mode-specific
pipelines (continuation = continuity-first write → light critic/polish → transactional persist);
transactional + idempotent community writes; app-level LLM timeout/retry; Zod route validation;
a minimal Vitest suite (billing, validation, graph fallbacks, poll-settle idempotency).

**Phase 2 — UX, extensibility, performance (partial — DONE):** a **cancel** button on the create
page (wired to the existing AbortController); **pre-charge cost disclosure** in the continue + branch
dialogs; **batched per-scene RAG embeddings** (fetched in parallel before the sequential write loop).

**Phase 2 — deliberately deferred (justified):**
- **Scene-prose parallelization: NOT done — it would be wrong.** Scenes are written with rolling
  continuity (each against the previous scene's tail + a running turn memo), so prose generation is
  inherently sequential. Only the independent RAG embeddings were parallelized.
- **DB composite indexes: deferred to a coordinated migration.** Per the db-push gotcha
  (`project_payment_system` memory), a naive `prisma migrate` would drop the pgvector / pg_trgm /
  LangGraph-checkpoint objects Prisma can't model. Indexes should ship as a surgical idempotent SQL
  migration applied with `prisma db execute` + `migrate resolve`, coordinated with prod — not a
  drive-by schema edit.
- **Full `FandomConfig` / `ModelProvider` abstraction: deferred.** There is exactly one fandom (HSR)
  and one provider (OpenAI) today; building the abstraction now is premature per the project's
  ROI-justified-decisions stance. The seam (centralize the fandom label + RAG namespace) is the first
  step when a second fandom actually arrives.
- **Regenerate-with-same-prompt + series-wide reading progress: deferred** as lower-priority UX polish.

## Guardrails (unchanged)

Agent stays in-process; no microservices; stay on Prisma 7 / Cloudinary / Neon (no
Drizzle/R2/Redis). Structured outputs, JSON logs, typed errors. Conventional Commits.
