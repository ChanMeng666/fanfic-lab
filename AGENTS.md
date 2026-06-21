# AGENTS.md

This file provides project guidance to AI coding assistants (Claude Code, GitHub Copilot, Cursor,
Codex, etc.) working with this repository. Read it before writing or changing any code. It is the
single most up-to-date description of how this project actually works.

## Project Overview

**FanFic Lab** is an autonomous Honkai: Star Rail (HSR) fanfiction generator. A user describes the
story they want; the **DreamWriter** agent (LangGraph.js) plans, writes, self-reviews for
out-of-character (OOC) issues, summarizes, and delivers a finished fanfic. Around that sits a social
reading layer (feed, reader, likes/comments/follows/notifications, profiles).

- **Primary stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · TailwindCSS 4
- **Single deployable:** the DreamWriter agent runs **in-process** inside the Next.js app. There is
  **no separate agent service** and **no `LANGGRAPH_URL`**.
- **Default branch:** `master` · **Repository:** https://github.com/ChanMeng666/fanfic-lab
- **Live:** https://fanfic-lab.tech (DigitalOcean VPS behind Traefik/Coolify, Cloudflare CDN)

## Commands

```bash
npm install                  # install dependencies (postinstall runs `prisma generate`)
npm run dev                  # start the app at http://localhost:3000 (agent runs in-process)
npm run dev:studio           # OPTIONAL local-only LangGraph Studio (port 8123) for agent debugging
npm run build                # prisma generate + next build (standalone output)
npm run start                # start production server
npm run lint                 # ESLint

# Data utilities (non-interactive; dry-run unless --apply)
npm run regen-summaries      # backfill/regenerate story summaries
npm run backfill-embeddings  # generate recommendation embeddings for stories missing them
```

There is **no automated test suite**. Manual E2E scenarios live in [`TESTING_GUIDE.md`](./TESTING_GUIDE.md).
Type-check with `npx tsc --noEmit` (clean = exit 0).

## Architecture & Conventions

### Request → story flow
1. `src/app/(main)/(protected)/create/page.tsx` (+ `src/components/create/*`, hook
   `src/lib/hooks/useStoryCreation.ts`) POSTs the prompt to **`src/app/api/create/route.ts`**.
2. That route calls **`getGraph()`** from `src/agent/dreamwriter/graph.ts` and streams the compiled
   LangGraph `graph.stream(..., { streamMode: "updates" })` **in-process**, emitting each node update
   to the client as SSE `CreationProgressEvent`s.
3. The client saves the finished `result` via **`src/app/api/stories/route.ts`** (story + first
   chapter + a `Generation` ledger row; recommendation embedding is computed asynchronously).
4. `src/app/api/stories/[id]/continue/route.ts` appends additional AI-written chapters.

### The DreamWriter pipeline (`src/agent/dreamwriter/`)
Linear graph with a conditional revision loop (`graph.ts`):
`intent_parser → story_architect → writer → quality_guard → [revision_counter → writer]* → summarize → delivery`
- Nodes in `nodes/*.ts`; prompts in `prompts/system.ts`; HSR knowledge prompt in `prompts/hsr.ts`.
- `quality_guard` scores OOC/consistency/prose; if `score < 7` and `revisionCount < 2` it loops back
  to `writer` with feedback (`MAX_REVISIONS = 2`).
- **Structured outputs:** the JSON nodes (intent/architect/quality/delivery) use
  `model.withStructuredOutput(zodSchema)` with schemas in `src/agent/dreamwriter/schemas.ts`. Do
  **not** reintroduce hand-rolled JSON parsing.
- **Checkpointer:** `getGraph()` compiles with a **Postgres** saver
  (`@langchain/langgraph-checkpoint-postgres`) using `DATABASE_URL_UNPOOLED` (falls back to
  `DATABASE_URL`). It lazily runs `setup()` once per process (idempotent; creates `checkpoint*`
  tables, separate from Prisma tables). The `graph` export (MemorySaver) exists only for the local
  Studio dev server referenced by `langgraph.json`.
- **Prompt caching:** keep the large static knowledge/system content as a stable **prefix** in the
  `SystemMessage`; put per-request variable content (RAG passages, outline) in the `HumanMessage`.
  This keeps OpenAI's automatic prefix cache effective. (See `nodes/writer.ts` for the pattern.)

### Data layer
- **Prisma 7** + **Neon Postgres** + **pgvector**. Client singleton: `src/lib/db.ts` (PrismaPg adapter).
- Vector columns are `Unsupported("vector(1536)")`; vector reads/writes use raw SQL
  (`src/lib/story-embedding.ts`, `src/knowledge/base/rag.ts`). Embeddings: OpenAI
  `text-embedding-3-small`.
- Schema + migrations in `prisma/`. Server data access is via Prisma in `src/lib/actions/*`
  (`"use server"`) and the API routes.

### Cross-cutting conventions
- **Logging:** use the structured JSON logger in `src/lib/logger.ts` (`logger.info/warn/error(event, fields)`),
  **not** `console.log`. Events are one JSON object per line for machine parsing.
- **Errors:** throw `AppError(ErrorCode.X)` from `src/lib/errors.ts`; the UI boundary maps codes to
  Chinese strings via `src/lib/format-error.ts`. Don't add new regex message-matching.
- **Auth:** Stack Auth (`@stackframe/stack`) — this is the engine behind Neon Auth. Server app in
  `src/lib/stack.ts`; users are mirrored into the `User` table by `syncUser()` in
  `src/lib/actions/user.ts`.
- **Billing:** per-1k-words charging logic lives in `src/lib/actions/credits.ts`
  (`creditsForWords`, `deductCredits`). The `Generation` table is the result ledger. **Live deduction
  is intentionally NOT wired on** — flipping it is a deliberate product decision, not a bugfix.
- **UI/design system:** follow [`CLAUDE.md`](./CLAUDE.md) — semantic Tailwind color tokens
  (`bg-surface`, `text-foreground`, `text-accent` for AI), **Lucide icons only (no emoji in UI)**,
  `font-display` (Cormorant Garamond) for headings, amber/accent for AI, teal/primary for actions.

### Directory map
```
src/
├── app/                      # App Router: (main) public + (protected) auth routes; api/*
├── components/               # ui/ (shadcn), create/, story/, feed/, credits/, layout/, providers/
├── agent/dreamwriter/        # in-process LangGraph: graph.ts, state.ts, schemas.ts, nodes/, prompts/
├── knowledge/                # HSR knowledge pack + pgvector RAG retrieval
└── lib/                      # actions/ (server actions), hooks/, types/, db.ts, redis.ts,
                              #   cloudinary.ts, logger.ts, errors.ts, format-error.ts, story-embedding.ts
prisma/                       # schema.prisma + migrations
Dockerfile.web                # single production image (bundles the in-process agent)
docker-compose.coolify.yml    # single `web` service
.github/workflows/deploy.yml  # CI: build web image → GHCR → SSH deploy to VPS
```

## Gotchas & Anti-patterns

- **The agent is in-process.** There is no agent container, no `LANGGRAPH_URL`, no `Dockerfile.agent`.
  Don't "reconnect" the route to an HTTP agent — call `getGraph()` and stream it.
- **CopilotKit is gone.** Ignore any historical references to it. There is no `/api/copilotkit`, no
  Creative Wizard, no Smart Editor, no HITL approval cards. The product is the DreamWriter create
  page + reader + feed. (Historical lessons are archived under `docs/archive/`.)
- **`docs/archive/` and `docs/superpowers/` are historical**, not current guidance. They are dated
  records of past designs/decisions — do not treat them as the current architecture. AGENTS.md,
  README.md, and CLAUDE.md are the sources of truth.
- **Checkpointer needs an unpooled connection.** Use `DATABASE_URL_UNPOOLED`; Neon's pooled endpoint
  breaks the saver's prepared statements.
- **pgvector via raw SQL.** Prisma can't write the `vector` type directly — use the helpers in
  `story-embedding.ts` / `rag.ts`, not `prisma.update` for embeddings.
- **`@tavily/core` / `@langchain/tavily` are dependencies but currently unused** in `src`. Don't
  assume live web research exists; there's a Redis research cache scaffold but no wired Tavily calls.
- **`npm run build` runs `prisma generate`.** If Prisma types look stale, build or run
  `npx prisma generate`.
- **Node:** requires `>=20.9.0` (Prisma 7). Next.js 16 / React 19 may differ from older training data.

## Deferred architecture decisions (do NOT undo without discussing)

These were evaluated and **intentionally not adopted** for this project's current stage. Don't
"modernize" into them unprompted:
- **Stay on Prisma 7** (do not migrate to Drizzle): Prisma 7 dropped the Rust engine; the only Drizzle
  win (vector ergonomics) is isolated and not worth a full data-layer rewrite now.
- **Keep Cloudinary** (do not move to Cloudflare R2): R2 has no transforms and would lose face-aware
  cropping; no cost benefit at current scale.
- **No Terraform/Pulumi/CrossGuard** yet: low ROI for a solo, single-environment VPS; Neon's native
  delete-protection is paid-only and the free 6h PITR is already maxed.
- **No microservices, ever.** One monolith, one codebase — keep the agent in-process.
- **Public agent API + Stripe metering** is deferred until the product stabilizes.

## Reading Order

1. `README.md` — what the project is and how to run it
2. This `AGENTS.md` — how it actually works and how to work in it
3. `CLAUDE.md` — design-system rules and UI/coding conventions
4. `TESTING_GUIDE.md` — manual E2E scenarios
5. `docs/DEPLOYMENT.md` — deployment details

## Conventions for Changes

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Run `npm run lint` and `npx tsc --noEmit` before proposing changes.
- New agent JSON output → add a Zod schema in `schemas.ts` + `withStructuredOutput`.
- New logs → `logger.*` (JSON); new error paths → `AppError` + an `ErrorCode`.
- Keep this file accurate when you change build steps, structure, the pipeline, or conventions.
- Do not commit or push unless the user asks.
