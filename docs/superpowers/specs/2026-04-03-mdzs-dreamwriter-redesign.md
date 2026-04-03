# MDZS DreamWriter - Product Redesign Spec

## Context

FanFic Lab is currently an AI-assisted fanfiction writing tool with a fixed 7-node LangGraph pipeline. Users manually drive each step (select fandom, pick CP, set constraints, approve outline, receive draft). This is a "selling tools" model — users pay for AI writing features, not for finished results.

The goal of this redesign is to transform the product into a **"selling results" model**: users describe what they want in natural language, and an autonomous Agent delivers a complete, high-quality, publication-ready short story. The MVP is scoped to a single fandom — **《魔道祖师》(The Grandmaster of Demonic Cultivation / MDZS)** — to build deep domain expertise rather than shallow breadth.

**Why MDZS:** Massive global fandom (Chinese + international), extremely active fanfic community, fans have strong opinions about character accuracy (OOC detection is a real pain point), and the fandom has well-defined characters/relationships that an AI can deeply learn.

---

## Product Definition

### One-Line Pitch
> "Describe your dream MDZS story in one sentence. The Agent delivers a complete, in-character short story."

### Target User
MDZS fans who:
- Want to read stories with specific CP + trope + setting combinations that don't exist yet
- Are frustrated by OOC content in existing fanfic
- Have vivid story ideas but lack writing ability or time
- Primarily Chinese-speaking (with English as secondary market)

### Core User Flow
```
User: "给我写一篇忘羡的现代AU，蓝忘机是钢琴家，魏无羡是街头画家，HE"
                    │
                    ▼
        Agent autonomously:
        1. Parses intent (CP: 忘羡, AU: 现代, roles, ending: HE)
        2. Consults MDZS knowledge base for character accuracy
        3. Plans story structure (no user approval needed by default)
        4. Writes complete story with RAG-assisted canon fidelity
        5. Self-reviews for OOC, consistency, quality
        6. Auto-iterates if quality below threshold
                    │
                    ▼
        User receives: Complete 2000-6000 word short story
        Ready to read. No editing needed.
```

### What "Selling Results" Means Concretely
| Aspect | Old (Selling Tools) | New (Selling Results) |
|--------|--------------------|-----------------------|
| Input | 4-step wizard form | One natural language sentence |
| Process | User drives each step | Agent fully autonomous |
| Output | Draft needing editing | Publication-ready story |
| Quality | User judges quality | Agent self-validates quality |
| Knowledge | Web search at runtime | Pre-built deep MDZS expertise |
| Memory | None (stateless) | Learns user preferences over time |

---

## MDZS Knowledge System

### Architecture
```
┌─────────────────────────────────────────────────┐
│              MDZS Knowledge System              │
├──────────────────┬──────────────────────────────┤
│  Structured      │  RAG Retrieval Layer         │
│  Knowledge Layer │  (On-demand)                 │
│  (Always in      │                              │
│   context)       │                              │
├──────────────────┼──────────────────────────────┤
│ Character Files  │ Full novel vectorized        │
│ - Personality    │ Chunked by scene/chapter     │
│ - Speech patterns│ Retrieved during writing     │
│ - Relationships  │ for canon-accurate details   │
│ - Timeline state │                              │
│                  │                              │
│ World Rules      │                              │
│ - Cultivation    │                              │
│ - Clans/Sects    │                              │
│ - Geography      │                              │
│ - Timeline       │                              │
│                  │                              │
│ CP Dynamics      │                              │
│ - WangXian core  │                              │
│ - Side pairings  │                              │
│ - Interaction    │                              │
│   patterns       │                              │
│                  │                              │
│ Trope Templates  │                              │
│ - Modern AU      │                              │
│ - Campus AU      │                              │
│ - IF timelines   │                              │
│ - Canon-divergent│                              │
└──────────────────┴──────────────────────────────┘
```

### Structured Knowledge Layer (~5000-10000 tokens)
Human-curated, extracted from the original novel. Injected into Agent system prompt on every invocation.

Contents:
- **Character profiles**: Personality traits, speech patterns (口癖), behavioral tendencies, emotional triggers, growth arcs across timeline
- **Relationship dynamics**: How each pair interacts, power dynamics, communication styles, key turning points
- **World-building rules**: Cultivation system, sect hierarchies, geography, supernatural mechanics
- **CP-specific templates**: Common interaction patterns for 忘羡 and other pairings
- **Trope mapping**: How MDZS characters would behave in common AU settings

### RAG Retrieval Layer
- Original novel text vectorized and stored in **pgvector** (Neon PostgreSQL extension, no new infra needed)
- Chunked by scene/chapter with metadata (characters present, location, timeline period)
- Agent autonomously retrieves relevant passages when writing to ensure:
  - Canon-accurate environmental descriptions
  - Consistent character voice
  - Correct world-building details

### Why Not Fine-Tuning
- GPT-4o / Claude already have strong creative writing capability
- Knowledge injection + RAG achieves domain expertise without fine-tuning cost
- More flexible: updating knowledge is editing documents, not retraining
- MVP validation before investing in fine-tuning

---

## Agent Architecture

### From Fixed Pipeline to Adaptive Agent Graph

**Current**: 7 fixed sequential nodes, mandatory HITL at planning stage
**New**: Dynamic graph with conditional routing, optional HITL, self-healing quality loops

### Agent Graph Design

```
START
  │
  ▼
┌─────────────────┐
│  Intent Parser   │  Model: fast (gpt-4o-mini / haiku)
│                  │  Input: user's natural language request
│                  │  Output: structured StoryRequest
│                  │  Behavior:
│                  │    - If request is clear → proceed
│                  │    - If ambiguous → ask clarifying question (1 max)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Story Architect  │  Model: strong (gpt-4o / sonnet)
│                  │  Input: StoryRequest + MDZS knowledge
│                  │  Output: StoryOutline (structure, scenes, arcs)
│                  │  Behavior:
│                  │    - Consult character profiles for IC accuracy
│                  │    - Plan emotional arc matching requested tone
│                  │    - Determine word count from complexity
└────────┬────────┘
         │
         ├──── [Conditional] User opted for outline review?
         │     YES → interrupt, show outline, wait for feedback
         │     NO  → proceed directly (default)
         │
         ▼
┌─────────────────┐
│     Writer       │  Model: strong (gpt-4o / sonnet)
│                  │  Input: StoryOutline + RAG-retrieved canon passages
│                  │  Output: Complete story draft
│                  │  Behavior:
│                  │    - RAG query for relevant canon details
│                  │    - Write in segments for coherence
│                  │    - Maintain character voice consistency
│                  │    - Support both Chinese and English
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Quality Guard    │  Model: fast (gpt-4o-mini / haiku)
│                  │  Input: draft + character profiles + StoryRequest
│                  │  Output: QualityReport (score + issues)
│                  │  Checks:
│                  │    - OOC detection (core differentiator)
│                  │    - Plot consistency
│                  │    - World-building accuracy
│                  │    - Prose quality
│                  │    - Request fulfillment
└────────┬────────┘
         │
         ├──── Quality score < threshold?
         │     YES → route back to Writer with specific fix instructions
         │           (max 2 iterations, then deliver with quality note)
         │     NO  → proceed to delivery
         │
         ▼
┌─────────────────┐
│    Delivery      │  Format and present
│                  │  - Story with metadata (word count, characters, tags)
│                  │  - Quality score badge
│                  │  - "More like this" suggestions
│                  │  - Record to user preference profile
└─────────────────┘
```

### State Management
```typescript
// Core state for the adaptive agent
interface DreamWriterState {
  // Request
  messages: BaseMessage[];
  storyRequest: StoryRequest | null;
  
  // Planning
  storyOutline: StoryOutline | null;
  
  // Writing
  storyDraft: string | null;
  ragContext: string[];          // Retrieved canon passages
  
  // Quality
  qualityReport: QualityReport | null;
  revisionCount: number;        // Track self-healing iterations
  
  // Delivery
  deliverable: StoryDeliverable | null;
  
  // User Profile (long-term, persisted)
  userPreferences: UserPreferences | null;
}
```

### Key Architectural Decisions
1. **LangGraph.js remains the runtime** — proven, already in the codebase, supports everything needed
2. **Conditional routing replaces fixed pipeline** — Agent decides the path based on request complexity
3. **Self-healing quality loop** — Agent iterates on its own output, user doesn't see drafts
4. **HITL is opt-in, not mandatory** — Default is fully autonomous; power users can enable outline review
5. **Persistent checkpointer** — Upgrade from MemorySaver to PostgreSQL-backed checkpointer for user preference memory
6. **Knowledge injection via system prompt** — Structured MDZS knowledge always available, no retrieval latency
7. **RAG for details only** — Only the Writer node uses RAG, and only for specific canon details

### User Intervention (Mixed Mode)
During Agent execution, users can optionally:
- See the Agent's current stage (transparent progress)
- Send a message to redirect ("让这段更虐一点", "不要写这个角色的死亡")
- The Agent treats user messages as priority instructions and adjusts accordingly
- If no user intervention, Agent runs to completion autonomously

---

## Frontend Experience

### Page Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | MDZS-themed hero, dream input box, sample stories |
| `/create` | Creation | Full-screen input + Agent progress view |
| `/story/[id]` | Reading | Beautiful story display with metadata |
| `/shelf` | My Shelf | Generation history, favorites, preferences |
| `/gallery` | Gallery | Community stories (opt-in public) |
| `/profile` | Profile | User settings, subscription management |
| `/auth` | Auth | Sign-in/Sign-up |

### Landing Page Design
- MDZS visual theme (ink wash / 水墨风, teal + amber palette retained)
- Hero section: Large input box — "描述你想看的魔道祖师故事..."
- Quick-start tags below input: 忘羡甜饼 / 现代AU / 虐恋HE / IF线 / 校园AU / 豆花
- Sample stories carousel: showcase quality
- No wizard, no multi-step form

### Creation Experience (`/create`)
```
┌──────────────────────────────────────────────────┐
│  [Your Request]                                   │
│  "忘羡现代AU，蓝忘机是钢琴家，魏无羡是街头画家"      │
├──────────────────────────────────────────────────┤
│                                                   │
│  Agent Progress (transparent but non-intrusive):  │
│                                                   │
│  ✓ 理解你的创作需求                                │
│  ✓ 构思故事结构                                    │
│  ● 正在写作中... (2/5 段落)                        │
│  ○ 质量检查                                       │
│  ○ 交付                                           │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ [可选] 想对创作过程说点什么？                  │  │
│  │ ________________________________________     │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└──────────────────────────────────────────────────┘
```

### Story Reading Experience (`/story/[id]`)
- Clean, literary layout with `font-prose` (Lora)
- Story metadata: CP, tags, word count, quality score
- AI quality badge (OOC check passed / character accuracy rating)
- Actions: Save to shelf, Share, Regenerate, "More like this"
- Related stories suggestions

---

## Business Model

### Tier Structure

| Tier | Price | Limits | Features |
|------|-------|--------|----------|
| **Free** | ¥0 | 1 story/day, ≤2000 words | Basic CP/trope, no preference memory |
| **Monthly** | ¥29/mo | 3 stories/day, unlimited words | All settings, preference learning, priority queue |
| **Quarterly** | ¥69/quarter | Monthly perks + Agent style training | Custom tone/style preferences, early access to new fandoms |

### Revenue Drivers
- **Free tier hooks users**: Quality is high enough to create desire for more
- **Word count limit drives upgrades**: Free stories are short; paid stories can be full novelettes
- **Preference memory creates lock-in**: The more you use it, the better it knows your taste
- **Fandom expansion creates growth**: Each new fandom unlocks a new user base

### Credit System
- Retain existing `UserCredits` and `Generation` models from database
- Free tier: 1 credit/day (auto-refill)
- Paid tiers: credits based on subscription level
- Each generation consumes credits based on word count and model usage

---

## Technical Architecture

### Stack Changes

| Component | Current | New |
|-----------|---------|-----|
| Agent graph | Fixed 7-node pipeline | Adaptive conditional graph |
| Agent knowledge | Tavily web search | Pre-built MDZS knowledge + pgvector RAG |
| State persistence | MemorySaver (in-memory) | PostgreSQL checkpointer (persistent) |
| Frontend flow | 4-step wizard + editor | Single input → progress → delivery |
| CopilotKit | Removed | N/A (stays removed) |
| Vector DB | None | pgvector (Neon PostgreSQL extension) |

### What Gets Kept
- **Next.js 16 + React 19 + TailwindCSS 4** — frontend framework stays
- **LangGraph.js** — Agent runtime stays, graph structure changes
- **Prisma + Neon PostgreSQL** — database stays, add pgvector extension
- **Redis (Upstash)** — caching stays
- **Cloudinary** — image storage stays
- **Docker + Coolify deployment** — infra stays
- **Design system** — teal/amber palette, Lucide icons, font system all stay
- **Auth (Stack Auth)** — authentication stays

### What Gets Rebuilt
- **Agent graph** — New adaptive graph with MDZS knowledge injection
- **Agent prompts** — All new MDZS-specific prompts
- **Knowledge system** — New: structured knowledge files + RAG pipeline
- **Frontend pages** — New: landing, create, story reading, shelf, gallery
- **API routes** — Simplified: `/api/create` (SSE), `/api/stories`, `/api/preferences`
- **Editor** — Removed for MVP (stories are delivered as finished products, no editing needed)

### What Gets Removed
- **Quick Generator wizard** — Replaced by single input
- **Editor + SmartEditor** — MVP delivers finished stories, no editing
- **Wizard page** — Replaced by single input
- **Tavily web search** — Replaced by pre-built knowledge
- **Image generation tools** — Already disabled, remove entirely for MVP
- **Generic fandom support** — MVP is MDZS-only

### Directory Structure
```
src/
├── agent/
│   ├── core/                    # Reusable agent infrastructure
│   │   ├── graph.ts             # Adaptive graph builder
│   │   ├── state.ts             # State definition
│   │   └── checkpointer.ts     # PostgreSQL checkpointer setup
│   ├── nodes/                   # Agent nodes
│   │   ├── intent-parser.ts     # Parse user request
│   │   ├── story-architect.ts   # Plan story structure
│   │   ├── writer.ts            # Write story with RAG
│   │   ├── quality-guard.ts     # OOC + quality check
│   │   └── delivery.ts          # Format and deliver
│   ├── prompts/
│   │   ├── base/                # Reusable prompt fragments
│   │   └── mdzs/                # MDZS-specific prompts
│   └── langgraph.json
├── knowledge/
│   ├── base/                    # Knowledge system interfaces
│   │   ├── types.ts             # FandomKnowledge interface
│   │   └── rag.ts               # RAG retrieval utilities
│   └── mdzs/                    # MDZS knowledge pack
│       ├── characters.ts        # Character profiles
│       ├── relationships.ts     # Relationship dynamics
│       ├── world.ts             # World-building rules
│       ├── tropes.ts            # Common AU/trope templates
│       └── index.ts             # Pack entry point
├── app/
│   ├── page.tsx                 # Landing (MDZS-themed)
│   ├── (main)/
│   │   ├── (protected)/
│   │   │   ├── create/          # Creation flow
│   │   │   ├── shelf/           # My stories
│   │   │   └── profile/         # Settings & subscription
│   │   ├── story/[id]/          # Story reading
│   │   └── gallery/             # Community gallery
│   └── api/
│       ├── create/route.ts      # SSE creation endpoint
│       ├── stories/             # Story CRUD
│       └── preferences/         # User preference API
├── components/
│   ├── create/                  # Creation flow components
│   ├── story/                   # Story display components
│   ├── shelf/                   # Shelf/library components
│   └── shared/                  # Shared UI components
└── lib/
    ├── hooks/
    │   ├── useStoryCreation.ts  # Creation flow hook
    │   └── usePreferences.ts    # User preferences hook
    └── types/
        └── story.ts             # Shared types
```

### Extensibility Path
Adding a new fandom (e.g., 天官赐福) requires:
1. Create `src/knowledge/tgcf/` with character profiles, relationships, world rules
2. Add fandom-specific prompts to `src/agent/prompts/tgcf/`
3. Vectorize the new novel text into pgvector
4. Add fandom selection to the UI (when multiple fandoms exist)

The core Agent architecture (`src/agent/core/`) and infrastructure remain unchanged.

---

## Data Model Changes

### New/Modified Models

```prisma
// Add to existing schema

model UserPreference {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Learned preferences (updated by Agent after each generation)
  preferredCPs      String[]    // e.g., ["忘羡", "曦澄"]
  preferredTropes   String[]    // e.g., ["现代AU", "甜饼", "HE"]
  avoidTropes       String[]    // e.g., ["主要角色死亡", "NTR"]
  tonePreference    String?     // e.g., "偏虐带HE", "纯甜"
  lengthPreference  String?     // e.g., "short", "medium", "long"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model KnowledgeChunk {
  id          String   @id @default(cuid())
  fandom      String   @default("mdzs")
  content     String   // Original text chunk
  embedding   Unsupported("vector(1536)")  // pgvector
  metadata    Json     // { chapter, characters, location, timeline }
  
  createdAt   DateTime @default(now())
  
  @@index([fandom])
}
```

### Existing Models Retained
- `User`, `Story`, `Chapter`, `Generation`, `UserCredits` — kept as-is
- `Character` — kept but pre-populated with MDZS canon characters
- `Like`, `Comment`, `Follow` — kept for gallery social features
- `Fandom`, `Tag` — kept, pre-populated with MDZS data

---

## Verification Plan

### End-to-End Test Flow
1. **Knowledge System**: Verify structured knowledge loads correctly and RAG retrieval returns relevant passages
2. **Agent Graph**: Send a natural language request → verify Agent autonomously produces a complete story without user intervention
3. **Quality Guard**: Verify OOC detection catches intentional OOC content and quality loop triggers revision
4. **Frontend**: Verify single-input → progress → story delivery flow works end-to-end
5. **Preferences**: Generate multiple stories → verify Agent learns and applies user preferences
6. **Subscription**: Verify free tier limits (1/day, ≤2000 words) and paid tier unlocks

### Quality Benchmarks
- Agent should produce a complete story in < 60 seconds
- OOC detection should catch at least 80% of obvious character inconsistencies
- Story quality should be rated 4/5+ by MDZS fans in user testing
- Zero manual intervention needed for standard requests

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Story quality not good enough | Users won't pay | Deep MDZS knowledge + quality guard + human evaluation during beta |
| Copyright concerns (using original novel text) | Legal risk | Use for RAG reference only, not reproduction; consult legal |
| LLM costs per story too high | Margin squeeze | Use fast models where possible; cache common patterns |
| Cold start (no user preferences) | Poor first experience | Pre-set sensible defaults based on popular preferences |
| Single fandom too narrow | Limited market | MDZS fandom is massive; validate before expanding |
