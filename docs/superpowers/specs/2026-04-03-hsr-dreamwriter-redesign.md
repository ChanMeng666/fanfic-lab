# HSR DreamWriter - Product Redesign Spec

## Context

FanFic Lab is currently an AI-assisted fanfiction writing tool with a fixed 7-node LangGraph pipeline. Users manually drive each step (select fandom, pick CP, set constraints, approve outline, receive draft). This is a "selling tools" model — users pay for AI writing features, not for finished results.

The goal of this redesign is to transform the product into a **"selling results" model**: users describe what they want in natural language, and an autonomous Agent delivers a complete, high-quality, publication-ready short story. The MVP is scoped to a single fandom — **《崩坏：星穹铁道》(Honkai: Star Rail / HSR)** — to build deep domain expertise rather than shallow breadth.

**Why Honkai: Star Rail:**
- **"常态在线"永动机**: Live-service game with continuous updates, new characters, and story patches = endless fan content demand (Mydei/Phainon went from 0 to 7,678 fics in one year)
- **中国+全球双市场**: HoYoverse has massive Chinese and international audiences
- **粉丝已有氪金习惯**: Gacha players already spend on digital content — lower friction to pay for AI stories
- **深度世界观+多CP矩阵**: Complex lore with deliberate narrative gaps, 80+ characters, dozens of popular pairings across regions
- **2025趋势报告明确指出**: Game fandoms are overtaking TV/film in fanfic production; HoYoverse maintains "霸权地位"

---

## Product Definition

### One-Line Pitch
> "Describe your dream Honkai: Star Rail story in one sentence. The Agent delivers a complete, in-character short story."

### Target User
HSR fans who:
- Want to read stories with specific CP + trope + setting combinations that don't exist yet
- Are frustrated by OOC content in existing fanfic (HSR characters have complex, nuanced personalities)
- Have vivid story ideas inspired by game lore but lack writing ability or time
- Play HSR and already spend money on digital content
- Primarily Chinese-speaking (with English, Japanese, Korean as secondary markets)

### Core User Flow
```
User: "给我写一篇砂金×星期日的现代AU，砂金是赌场老板，星期日是大学教授，虐转甜HE"
                    │
                    ▼
        Agent autonomously:
        1. Parses intent (CP: 砂金×星期日, AU: 现代, roles, ending: HE)
        2. Consults HSR knowledge base for character accuracy
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
| Knowledge | Web search at runtime | Pre-built deep HSR expertise |
| Memory | None (stateless) | Learns user preferences over time |

---

## HSR Knowledge System

### Architecture
```
┌─────────────────────────────────────────────────┐
│              HSR Knowledge System               │
├──────────────────┬──────────────────────────────┤
│  Structured      │  RAG Retrieval Layer         │
│  Knowledge Layer │  (On-demand)                 │
│  (Always in      │                              │
│   context)       │                              │
├──────────────────┼──────────────────────────────┤
│ Character Files  │ Game dialogue/story text     │
│ - Personality    │ vectorized                   │
│ - Speech patterns│ Chunked by chapter/quest     │
│ - Relationships  │ Retrieved during writing     │
│ - Path resonance │ for canon-accurate details   │
│                  │                              │
│ World Rules      │                              │
│ - Paths (命途)   │                              │
│ - Aeons (星神)   │                              │
│ - Factions       │                              │
│ - Planets/Regions│                              │
│                  │                              │
│ CP Dynamics      │                              │
│ - Popular ships  │                              │
│ - Interaction    │                              │
│   patterns       │                              │
│                  │                              │
│ Trope Templates  │                              │
│ - Modern AU      │                              │
│ - Canon-divergent│                              │
│ - ABO            │                              │
│ - Hurt/Comfort   │                              │
└──────────────────┴──────────────────────────────┘
```

### Structured Knowledge Layer (~5000-10000 tokens)
Human-curated, extracted from game dialogue and story quests. Injected into Agent system prompt on every invocation.

Contents:
- **Character profiles**: Personality traits, speech patterns, behavioral tendencies, emotional triggers, combat style as personality reflection
- **Relationship dynamics**: How each pair interacts, power dynamics, communication styles, lore connections
- **World-building rules**: Path system (命途), Aeon hierarchy (星神), faction politics, planetary cultures
- **CP-specific templates**: Common interaction patterns for popular pairings (e.g., 砂金×星期日, 丹恒×景元, 藿藿×花火, etc.)
- **Trope mapping**: How HSR characters would behave in common AU settings, adapted from their canon personalities

### RAG Retrieval Layer
- Game dialogue and story quest text vectorized and stored in **pgvector** (Neon PostgreSQL extension)
- Chunked by quest/chapter with metadata (characters present, location, version/patch)
- Agent autonomously retrieves relevant passages when writing to ensure:
  - Canon-accurate dialogue voice
  - Consistent character behaviors
  - Correct world-building details

### Why Not Fine-Tuning
- GPT-4o / Claude already have strong creative writing capability
- Knowledge injection + RAG achieves domain expertise without fine-tuning cost
- More flexible: updating knowledge when new game versions release is just editing documents
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
│                  │  Input: StoryRequest + HSR knowledge
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
interface DreamWriterState {
  messages: BaseMessage[];
  storyRequest: StoryRequest | null;
  storyOutline: StoryOutline | null;
  storyDraft: string | null;
  ragContext: string[];
  qualityReport: QualityReport | null;
  revisionCount: number;
  deliverable: StoryResult | null;
  userPreferences: UserPreferences | null;
}
```

### Key Architectural Decisions
1. **LangGraph.js remains the runtime** — proven, already in the codebase
2. **Conditional routing replaces fixed pipeline** — Agent decides the path
3. **Self-healing quality loop** — Agent iterates on its own output
4. **HITL is opt-in, not mandatory** — Default is fully autonomous
5. **Persistent checkpointer** — Upgrade from MemorySaver to PostgreSQL-backed
6. **Knowledge injection via system prompt** — Structured HSR knowledge always available
7. **RAG for details only** — Only the Writer node uses RAG

### User Intervention (Mixed Mode)
During Agent execution, users can optionally:
- See the Agent's current stage (transparent progress)
- Send a message to redirect ("让这段更虐一点", "不要写角色死亡")
- The Agent treats user messages as priority instructions
- If no intervention, Agent runs to completion autonomously

---

## Frontend Experience

### Page Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | HSR-themed hero, dream input box, sample stories |
| `/create` | Creation | Full-screen input + Agent progress view |
| `/story/[id]` | Reading | Beautiful story display with metadata |
| `/shelf` | My Shelf | Generation history, favorites, preferences |
| `/gallery` | Gallery | Community stories (opt-in public) |
| `/profile` | Profile | User settings, subscription management |
| `/auth` | Auth | Sign-in/Sign-up |

### Landing Page Design
- HSR visual theme (星际/科幻风, teal + amber palette retained — teal fits HSR's cosmic aesthetic)
- Hero section: Large input box — "描述你想看的星穹铁道故事..."
- Quick-start tags below input: 砂金×星期日 / 丹恒×景元 / 现代AU / 虐转甜 / ABO / 豆花
- Sample stories carousel: showcase quality
- No wizard, no multi-step form

### Creation Experience (`/create`)
```
┌──────────────────────────────────────────────────┐
│  [Your Request]                                   │
│  "砂金×星期日现代AU，砂金是赌场老板"                  │
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

---

## Business Model

### Tier Structure

| Tier | Price | Limits | Features |
|------|-------|--------|----------|
| **Free** | ¥0 | 1 story/day, ≤2000 words | Basic CP/trope, no preference memory |
| **Monthly** | ¥29/mo | 3 stories/day, unlimited words | All settings, preference learning, priority queue |
| **Quarterly** | ¥69/quarter | Monthly perks + Agent style training | Custom tone/style preferences, early access to new content |

### Revenue Drivers
- **Free tier hooks users**: Quality is high enough to create desire for more
- **Word count limit drives upgrades**: Free stories are short; paid stories can be full novelettes
- **Preference memory creates lock-in**: The more you use it, the better it knows your taste
- **Version updates create growth**: Each new HSR version adds characters/CPs → new content → new users
- **Fandom expansion**: Architecture supports adding Genshin Impact, Love and Deepspace, etc.

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
| Agent knowledge | Tavily web search | Pre-built HSR knowledge + pgvector RAG |
| State persistence | MemorySaver (in-memory) | PostgreSQL checkpointer (persistent) |
| Frontend flow | 4-step wizard + editor | Single input → progress → delivery |
| Vector DB | None | pgvector (Neon PostgreSQL extension) |

### What Gets Kept
- Next.js 16 + React 19 + TailwindCSS 4
- LangGraph.js (graph structure changes)
- Prisma + Neon PostgreSQL (add pgvector)
- Redis (Upstash), Cloudinary, Docker + Coolify
- Design system (teal/amber palette, Lucide icons, fonts)
- Auth (Stack Auth)

### What Gets Rebuilt
- Agent graph (new adaptive graph with HSR knowledge injection)
- Agent prompts (all new HSR-specific prompts)
- Knowledge system (structured HSR knowledge files + RAG pipeline)
- Frontend pages (landing, create, story reading, shelf, gallery)
- API routes (`/api/create` SSE endpoint)

### What Gets Removed
- Quick Generator wizard, Editor, Wizard page
- Tavily web search (replaced by pre-built knowledge)
- Image generation tools (already disabled)
- Generic fandom support (MVP is HSR-only)

### Directory Structure
```
src/
├── knowledge/
│   ├── base/                    # Reusable knowledge interfaces
│   │   ├── types.ts
│   │   └── rag.ts
│   └── hsr/                     # MVP: Honkai: Star Rail knowledge pack
│       ├── characters.ts
│       ├── relationships.ts
│       ├── world.ts
│       ├── tropes.ts
│       └── index.ts
├── agent/
│   ├── dreamwriter/
│   │   ├── graph.ts
│   │   ├── state.ts
│   │   ├── nodes/
│   │   │   ├── intent-parser.ts
│   │   │   ├── story-architect.ts
│   │   │   ├── writer.ts
│   │   │   ├── quality-guard.ts
│   │   │   └── delivery.ts
│   │   └── prompts/
│   │       ├── system.ts
│   │       └── hsr.ts
```

### Extensibility Path
Adding a new fandom (e.g., 原神, 恋与深空) requires:
1. Create `src/knowledge/genshin/` or `src/knowledge/lads/` with character profiles, relationships, world rules
2. Add fandom-specific prompts to `src/agent/dreamwriter/prompts/`
3. Vectorize new game text into pgvector
4. Add fandom selection to the UI (when multiple fandoms exist)

Core Agent architecture remains unchanged.

---

## Data Model Changes

### New/Modified Models

```prisma
model UserPreference {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  preferredCPs      String[]
  preferredTropes   String[]
  avoidTropes       String[]
  tonePreference    String?
  lengthPreference  String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model KnowledgeChunk {
  id          String   @id @default(cuid())
  fandom      String   @default("hsr")
  content     String
  embedding   Unsupported("vector(1536)")
  metadata    Json

  createdAt   DateTime @default(now())

  @@index([fandom])
}
```

### Existing Models Retained
- User, Story, Chapter, Generation, UserCredits — kept as-is
- Character — kept but pre-populated with HSR canon characters
- Like, Comment, Follow — kept for gallery
- Fandom, Tag — kept, pre-populated with HSR data

---

## Verification Plan

### End-to-End Test Flow
1. Knowledge System: Verify structured knowledge loads and RAG returns relevant passages
2. Agent Graph: Send natural language request → verify complete story output
3. Quality Guard: Verify OOC detection catches intentional character inconsistencies
4. Frontend: Verify single-input → progress → story delivery
5. Preferences: Generate multiple stories → verify Agent learns preferences
6. Subscription: Verify free tier limits and paid tier unlocks

### Quality Benchmarks
- Agent produces complete story in < 90 seconds
- OOC detection catches 80%+ of obvious character inconsistencies
- Story quality rated 4/5+ by HSR fans in user testing
- Zero manual intervention needed for standard requests

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Story quality not good enough | Users won't pay | Deep HSR knowledge + quality guard + beta testing |
| Game content updates frequently | Knowledge becomes stale | Modular knowledge pack, easy to update per version |
| Copyright/IP concerns | Legal risk | Derivative fan work (fair use), not reproducing game text |
| LLM costs per story too high | Margin squeeze | Use fast models where possible; cache common patterns |
| Cold start (no user preferences) | Poor first experience | Sensible defaults based on popular HSR preferences |
| HSR fandom too fragmented | Hard to satisfy all CP fans | Start with top 5 most popular CPs, expand gradually |
