# AGENTS.md

This file provides project guidance to AI coding assistants (Claude Code, GitHub Copilot, Cursor,
Codex, etc.) working with this repository. Read it before writing or changing any code. It is the
single most up-to-date description of how this project actually works.

## Project Overview

**FanFic Lab** is an autonomous Honkai: Star Rail (HSR) fanfiction generator. A user describes the
story they want; the **DreamWriter** agent (LangGraph.js) plans, writes, self-reviews for
out-of-character (OOC) issues, summarizes, and delivers a finished fanfic. Around that sits a full
**community layer**: reading/feed/profiles + likes/comments/follows/notifications, plus AI-native
co-creation (reader branch续写, 接龙投票, 二创/remix), discovery (following feed, trending leaderboard,
weekly picks, collections), and retention (reactions, bookmarks, cross-device reading progress,
achievements + creation streak). **The community layer is documented in full in
[`docs/COMMUNITY_FEATURES.md`](./docs/COMMUNITY_FEATURES.md) — read it before touching social/discovery code.**

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
   chapter + a `Generation` ledger row; recommendation embedding is computed asynchronously; also
   accepts an optional `remixedFromId` and fires best-effort achievement/streak hooks).
4. `src/app/api/stories/[id]/continue/route.ts` appends additional AI-written chapters.

**Shared continuation engine:** the single writer-call logic (prompt + LLM call + title) lives in
`src/lib/actions/continuation-core.ts` (`generateContinuation`) and is reused by the author
`continue` route, the reader branch route (`stories/[id]/branches`), and poll settlement
(`stories/[id]/polls/[pollId]/settle`). Don't add a second writer path — extend the shared engine.

### The DreamWriter pipeline (`src/agent/dreamwriter/`)
Linear graph with a conditional targeted-revision loop (`graph.ts`):
`intent_parser → research → story_architect → scene_writer → quality_guard → [targeted_revision → quality_guard]* → polish → summarize → delivery`
- **Model routing:** all nodes get their LLM from the factory in `models.ts` (never `new ChatOpenAI`
  inline). Routes by job across the OpenAI GPT-5 family — writer/architect/critic/polish on `gpt-5.4`,
  cheap structured tasks (intent/summary/suggestions/research digest) on `gpt-5.4-mini`. Override any
  id via `DW_*_MODEL` env vars.
- `intent_parser` uses `state.inputIntent` (structured form input) directly when a CP is present —
  no LLM parse — and only falls back to parsing free text otherwise. `state.requestedLength` (the
  paid length) is authoritative over any inferred length.
- `research` (`nodes/research.ts` + `research.ts`) does optional live fandom research via Tavily for
  the parsed CP, digests it with an LLM, caches the brief in Postgres (`SourceResearchCache`), and
  puts it in `state.researchContext`. It emits no `stage` and degrades to `""` when `TAVILY_API_KEY`
  is unset or any step fails.
- `story_architect` plans against a **genre beat skeleton** (`beats.ts`, selected from tone/ending)
  and emits a rich outline (pov / themeLine / beatTemplate + per-scene hook/turn/beatType/sensoryAnchor).
- `scene_writer` (`nodes/scene-writer.ts`) drafts **scene-by-scene** with rolling continuity context
  (a turn memo + the previous scene's tail), NOT one single-shot call. Replaces the old `writer` node.
- `quality_guard` scores six dimensions (characterFidelity/pacing/proseTexture/emotionalPayoff/
  dialogue/immersion), flags AI-isms + specific scenes; if it misses the bar (`score < 8`) and there
  are flagged scenes and `revisionCount < 2`, it routes to `targeted_revision` (rewrites only the
  flagged scenes, preserving the rest), then re-checks (`MAX_REVISIONS = 2`).
- `polish` (`nodes/polish.ts`) does a final language-only de-AI/voice-unifying pass over the assembled
  draft (skipped for `short`); its output overwrites `storyDraft` for summarize + delivery.
- Nodes in `nodes/*.ts`; prompts in `prompts/system.ts`; HSR knowledge prompt in `prompts/hsr.ts`.
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

### Community & social layer
Full details in **[`docs/COMMUNITY_FEATURES.md`](./docs/COMMUNITY_FEATURES.md)**. Quick orientation:
- **Server actions** (`src/lib/actions/`): `branch.ts` (分支续写 + canonize), `poll.ts` (接龙投票),
  `remix.ts` (二创 seed), `reaction.ts` (多元反应), `bookmark.ts` (收藏), `reading-progress.ts`
  (继续阅读), `achievements.ts` (成就/打卡, catalog in `src/lib/achievements.ts`), `collection.ts`
  (专题合集), `trending.ts` (热门排行榜). Existing social lives in `story.ts` / `user.ts` /
  `notification.ts`.
- **SSE routes:** `stories/[id]/branches` (reader continuation), `stories/[id]/polls/[pollId]/settle`
  (author settles a poll) — both reuse `continuation-core.ts`.
- **Pages** (`src/app/(main)/`): `trending/`, `collections/` + `collections/[id]/`,
  `story/[id]/branch/[branchId]/`; the story page renders `BranchPolls` + `BranchTree` + 衍生作品.
- **Key invariants:** branches live in `StoryBranch` and never touch canon (only `canonizeBranch`
  creates a `Chapter`); the triggerer of paid AI pays via the `chargeContinuation` hook (live
  deduction still off); achievement/like/progress hooks are best-effort; adding a `NotificationType`
  means updating BOTH notification renderers (bell + `/notifications` client).

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
│                             #   (main): feed, trending, collections, story/[id](+/chapter,/branch), users
├── components/               # ui/ (shadcn), create/, story/, feed/, collections/, credits/, layout/, providers/
├── agent/dreamwriter/        # in-process LangGraph: graph.ts, state.ts, schemas.ts, nodes/, prompts/
├── knowledge/                # HSR knowledge pack + pgvector RAG retrieval
└── lib/                      # actions/ (server actions, incl. community: branch/poll/remix/reaction/
                              #   bookmark/reading-progress/achievements/collection/trending +
                              #   continuation-core), achievements.ts (catalog), hooks/, types/, db.ts,
                              #   research-cache.ts, cloudinary.ts, logger.ts, errors.ts, format-error.ts,
                              #   story-embedding.ts
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
- **Tavily research is wired but optional.** The `research` node (`@tavily/core`) runs only when
  `TAVILY_API_KEY` is set; otherwise it's a graceful no-op. Briefs are cached in Postgres
  (`src/lib/research-cache.ts` → `SourceResearchCache`, also exposed via `/api/research-cache`).
  **There is no Redis** — all caching is on Neon Postgres.
- **`npm run build` runs `prisma generate`.** If Prisma types look stale, build or run
  `npx prisma generate`.
- **`src/lib/hooks/useStory.ts` has a local `Story` interface mirroring the Prisma scalar set.** When
  you add a scalar column to the `Story` model, add it here too — otherwise the `data as Story[]` cast
  in `useMyStories` fails with a TypeScript "insufficient overlap" error. (Bit us 3× during the
  community suite.)
- **Two notification renderers must stay in sync** — `components/layout/NotificationBell.tsx` and
  `app/(main)/(protected)/notifications/notifications-client.tsx` both `switch` on `n.type`. Add new
  `NotificationType`s to both.
- **`lucide-react` dropped brand icons** (e.g. `Twitter`) in recent versions — don't import them; use
  a generic Lucide icon. (No emoji in UI regardless — see `CLAUDE.md`.)
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
3. `docs/COMMUNITY_FEATURES.md` — the full community/social layer (read before touching social/discovery code)
4. `CLAUDE.md` — design-system rules and UI/coding conventions
5. `TESTING_GUIDE.md` — manual E2E scenarios
6. `docs/DEPLOYMENT.md` — deployment details

## Conventions for Changes

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Run `npm run lint` and `npx tsc --noEmit` before proposing changes.
- New agent JSON output → add a Zod schema in `schemas.ts` + `withStructuredOutput`.
- New logs → `logger.*` (JSON); new error paths → `AppError` + an `ErrorCode`.
- Keep this file accurate when you change build steps, structure, the pipeline, or conventions.
- Do not commit or push unless the user asks.
