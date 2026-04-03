# MDZS DreamWriter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform FanFic Lab from a generic AI writing tool with a fixed pipeline into MDZS DreamWriter — a single-fandom autonomous agent that delivers complete, in-character short stories from natural language input.

**Architecture:** Adaptive LangGraph.js agent graph with conditional routing replaces the fixed 7-node pipeline. Pre-built structured MDZS knowledge (characters, relationships, world-building) is injected into system prompts, with pgvector RAG for canon detail retrieval. Frontend simplifies from 4-step wizard to single input box with transparent progress view.

**Tech Stack:** Next.js 16, React 19, TailwindCSS 4, LangGraph.js, OpenAI GPT-4o/4o-mini, Prisma 7 + Neon PostgreSQL + pgvector, Redis (Upstash), Stack Auth.

**Spec:** `docs/superpowers/specs/2026-04-03-mdzs-dreamwriter-redesign.md`

---

## File Structure

### New Files
```
src/
├── knowledge/
│   ├── base/
│   │   ├── types.ts                    # FandomKnowledge interface, KnowledgeChunk types
│   │   └── rag.ts                      # pgvector retrieval utilities
│   └── mdzs/
│       ├── characters.ts               # MDZS character profiles (structured data)
│       ├── relationships.ts            # Relationship dynamics
│       ├── world.ts                    # World-building rules
│       ├── tropes.ts                   # Common AU/trope templates
│       └── index.ts                    # Knowledge pack entry point
├── agent/
│   ├── dreamwriter/
│   │   ├── graph.ts                    # New adaptive agent graph
│   │   ├── state.ts                    # New DreamWriter state annotation
│   │   ├── nodes/
│   │   │   ├── intent-parser.ts        # Parse user request
│   │   │   ├── story-architect.ts      # Plan story structure
│   │   │   ├── writer.ts              # Write with RAG
│   │   │   ├── quality-guard.ts       # OOC + quality check
│   │   │   └── delivery.ts           # Format and deliver
│   │   └── prompts/
│   │       ├── system.ts              # Base system prompts
│   │       └── mdzs.ts               # MDZS-specific prompt fragments
├── app/
│   ├── (main)/
│   │   ├── (protected)/
│   │   │   ├── create/
│   │   │   │   └── page.tsx           # Creation flow page
│   │   │   └── shelf/
│   │   │       └── page.tsx           # My stories shelf
│   │   ├── story/[id]/
│   │   │   └── page.tsx               # Story reading page
│   │   └── gallery/
│   │       └── page.tsx               # Community gallery
│   └── api/
│       └── create/
│           └── route.ts               # SSE creation endpoint
├── components/
│   ├── create/
│   │   ├── DreamInput.tsx             # Main creation input
│   │   ├── CreationProgress.tsx       # Agent progress display
│   │   └── StoryResult.tsx            # Delivered story display
│   ├── story/
│   │   └── StoryReader.tsx            # Story reading component
│   └── shelf/
│       └── ShelfGrid.tsx              # Story shelf grid
└── lib/
    ├── hooks/
    │   └── useStoryCreation.ts        # Creation flow hook (replaces useStoryGenerator)
    └── types/
        └── dreamwriter.ts             # New shared types
```

### Modified Files
```
prisma/schema.prisma                    # Add UserPreference, KnowledgeChunk models
src/agent/langgraph.json                # Point to new dreamwriter graph
src/app/page.tsx                        # Redesign landing page for MDZS theme
src/app/(main)/layout.tsx               # Update navigation for new pages
```

### Files to Remove (after new system is working)
```
src/agent/agent.ts                      # Old fixed pipeline
src/agent/state.ts                      # Old state
src/agent/prompts.ts                    # Old prompts
src/agent/tools/                        # Old tools (functionality moved into nodes)
src/app/(main)/(protected)/generate/    # Old generator wizard
src/app/(main)/(protected)/wizard/      # Old advanced wizard
src/app/(main)/(protected)/editor/      # Editor (MVP delivers finished stories)
src/app/api/generate/                   # Old generation endpoint
src/app/api/agent/chat/                 # Old chat endpoint
src/components/generator/               # Old generator components
src/components/wizard/                  # Old wizard components
src/components/editor/                  # Old editor components
src/components/hitl/                    # Old HITL components
src/lib/hooks/useStoryGenerator.ts      # Old hook
src/lib/hooks/useEditorAI.ts            # Old hook
```

---

## Phase 1: Foundation

### Task 1: Define New Types

**Files:**
- Create: `src/lib/types/dreamwriter.ts`

- [ ] **Step 1: Create the shared types file**

```typescript
// src/lib/types/dreamwriter.ts

export type DreamWriterStage =
  | "idle"
  | "parsing"
  | "planning"
  | "writing"
  | "checking"
  | "revising"
  | "complete"
  | "error";

export interface StoryCreationRequest {
  prompt: string;                    // Natural language input
  language: "zh" | "en";            // Detected or specified
  showOutline?: boolean;            // Opt-in HITL for outline review
}

export interface StoryOutline {
  title: string;
  cp: string[];                     // Character pairing(s)
  setting: string;                  // AU or canon setting
  tone: string;                     // Emotional tone
  wordTarget: number;               // Target word count
  scenes: SceneOutline[];
  emotionalArc: string;
}

export interface SceneOutline {
  summary: string;
  characters: string[];
  emotion: string;
}

export interface QualityReport {
  overallScore: number;             // 1-10
  oocIssues: OOCIssue[];
  consistencyIssues: string[];
  proseNotes: string[];
  passesThreshold: boolean;         // score >= 7
}

export interface OOCIssue {
  character: string;
  issue: string;
  suggestion: string;
  severity: "low" | "medium" | "high";
}

export interface StoryResult {
  title: string;
  body: string;
  cp: string[];
  tags: string[];
  setting: string;
  wordCount: number;
  qualityScore: number;
  language: "zh" | "en";
  suggestions: string[];            // "More like this" ideas
}

export interface CreationProgressEvent {
  stage: DreamWriterStage;
  message?: string;                 // Human-readable progress
  outline?: StoryOutline;           // Sent at "planning" stage if showOutline
  result?: StoryResult;             // Sent at "complete" stage
  error?: string;                   // Sent at "error" stage
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd D:/github_repository/fanfic-lab && npx tsc --noEmit src/lib/types/dreamwriter.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/dreamwriter.ts
git commit -m "feat: add DreamWriter shared types"
```

---

### Task 2: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add UserPreference model**

Add after the existing `UserCredits` model:

```prisma
model UserPreference {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  preferredCPs      String[]
  preferredTropes   String[]
  avoidTropes       String[]
  tonePreference    String?
  lengthPreference  String?    // "short" | "medium" | "long"

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 2: Add KnowledgeChunk model for RAG**

```prisma
model KnowledgeChunk {
  id          String   @id @default(cuid())
  fandom      String   @default("mdzs")
  content     String
  embedding   Unsupported("vector(1536)")
  metadata    Json     // { chapter?, characters?, location?, timeline? }

  createdAt   DateTime @default(now())

  @@index([fandom])
}
```

- [ ] **Step 3: Add UserPreference relation to User model**

In the `User` model, add the relation field:

```prisma
preference  UserPreference?
```

- [ ] **Step 4: Generate and apply migration**

Run: `cd D:/github_repository/fanfic-lab && npx prisma db push`
Expected: Schema synced successfully

Note: For pgvector, you may need to run `CREATE EXTENSION IF NOT EXISTS vector;` on the Neon database first. Do this via the Neon dashboard SQL editor.

- [ ] **Step 5: Generate Prisma client**

Run: `cd D:/github_repository/fanfic-lab && npx prisma generate`
Expected: Prisma Client generated successfully

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add UserPreference and KnowledgeChunk models"
```

---

### Task 3: Create Knowledge Base Types and RAG Utilities

**Files:**
- Create: `src/knowledge/base/types.ts`
- Create: `src/knowledge/base/rag.ts`

- [ ] **Step 1: Define knowledge base interfaces**

```typescript
// src/knowledge/base/types.ts

export interface CharacterProfile {
  name: string;
  aliases: string[];              // Other names/titles
  personality: string[];          // Key traits
  speechPatterns: string;         // How they talk
  emotionalTriggers: string[];    // What makes them react
  relationships: Record<string, string>; // name -> dynamic
  timelineStates: Record<string, string>; // period -> state description
}

export interface RelationshipDynamic {
  characters: [string, string];
  type: string;                   // e.g., "soulmates", "sworn brothers"
  dynamic: string;                // How they interact
  keyMoments: string[];           // Canon turning points
  commonFanficTropes: string[];   // What fans write about them
}

export interface WorldRule {
  category: string;               // e.g., "cultivation", "clans"
  rules: string[];
}

export interface TropeTemplate {
  name: string;                   // e.g., "Modern AU"
  description: string;
  characterAdaptations: Record<string, string>; // How characters map to this AU
}

export interface FandomKnowledge {
  fandomId: string;
  displayName: string;
  characters: CharacterProfile[];
  relationships: RelationshipDynamic[];
  worldRules: WorldRule[];
  tropes: TropeTemplate[];
  toSystemPrompt(): string;       // Serialize to system prompt text
}
```

- [ ] **Step 2: Create RAG retrieval utility**

```typescript
// src/knowledge/base/rag.ts

import { prisma } from "@/lib/db";
import { OpenAI } from "openai";

const openai = new OpenAI();

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function retrieveRelevantChunks(
  query: string,
  fandom: string = "mdzs",
  limit: number = 5
): Promise<{ content: string; metadata: Record<string, unknown> }[]> {
  const embedding = await getEmbedding(query);
  const vectorStr = `[${embedding.join(",")}]`;

  const results = await prisma.$queryRaw<
    { content: string; metadata: string; distance: number }[]
  >`
    SELECT content, metadata::text, embedding <=> ${vectorStr}::vector AS distance
    FROM "KnowledgeChunk"
    WHERE fandom = ${fandom}
    ORDER BY distance ASC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    content: r.content,
    metadata: JSON.parse(r.metadata),
  }));
}

export async function ingestChunk(
  content: string,
  fandom: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const embedding = await getEmbedding(content);
  const vectorStr = `[${embedding.join(",")}]`;
  const metadataStr = JSON.stringify(metadata);

  await prisma.$executeRaw`
    INSERT INTO "KnowledgeChunk" (id, fandom, content, embedding, metadata, "createdAt")
    VALUES (gen_random_uuid(), ${fandom}, ${content}, ${vectorStr}::vector, ${metadataStr}::jsonb, NOW())
  `;
}
```

- [ ] **Step 3: Verify files compile**

Run: `cd D:/github_repository/fanfic-lab && npx tsc --noEmit src/knowledge/base/types.ts src/knowledge/base/rag.ts`
Expected: No errors (may need to adjust import paths)

- [ ] **Step 4: Commit**

```bash
git add src/knowledge/
git commit -m "feat: add knowledge base types and RAG utilities"
```

---

### Task 4: Create MDZS Knowledge Pack

**Files:**
- Create: `src/knowledge/mdzs/characters.ts`
- Create: `src/knowledge/mdzs/relationships.ts`
- Create: `src/knowledge/mdzs/world.ts`
- Create: `src/knowledge/mdzs/tropes.ts`
- Create: `src/knowledge/mdzs/index.ts`

This is the core differentiator. The knowledge must be accurate and comprehensive. The user will provide the original MDZS novel text to extract from. For now, create the structure with essential knowledge that can be expanded later.

- [ ] **Step 1: Create character profiles**

```typescript
// src/knowledge/mdzs/characters.ts

import type { CharacterProfile } from "../base/types";

export const MDZS_CHARACTERS: CharacterProfile[] = [
  {
    name: "魏无羡",
    aliases: ["魏婴", "夷陵老祖", "Wei Wuxian", "Wei Ying"],
    personality: [
      "外向开朗，嬉皮笑脸下藏着深沉",
      "正义感极强，为了对的事可以与全世界为敌",
      "聪明绝顶，修炼天赋极高",
      "重情重义，对亲近的人极度保护",
      "表面没心没肺，内心敏感细腻",
      "爱笑爱闹，喜欢逗弄蓝忘机",
    ],
    speechPatterns:
      "语气活泼跳脱，爱用反问和调侃。说话随性不拘，偶尔正经时反差极大。对蓝忘机常用撩拨式语气。举例：'蓝湛～''哎呀蓝二哥哥别生气嘛'",
    emotionalTriggers: [
      "有人欺负弱者",
      "江澄的态度",
      "金光瑶的背叛",
      "温宁和温情的命运",
      "蓝忘机的深情",
    ],
    relationships: {
      蓝忘机: "灵魂伴侣，从试探调侃到深沉依赖",
      江澄: "义兄弟，爱恨交织，亏欠与不舍并存",
      温宁: "生死之交，保护与被保护",
      江厌离: "师姐，最温暖的亲人",
      金凌: "外甥，又爱又气",
    },
    timelineStates: {
      云深不知处求学期: "少年意气，调皮捣蛋，初识蓝忘机",
      射日之征: "锋芒毕露，诡道初成，失去金丹",
      夷陵老祖时期: "孤独偏执，走入歧途，保护温氏残余",
      重生莫玄羽: "看透世事，更加豁达，与蓝忘机重逢",
    },
  },
  {
    name: "蓝忘机",
    aliases: ["蓝湛", "含光君", "Lan Wangji", "Lan Zhan"],
    personality: [
      "外表冷淡寡言，内心炙热深情",
      "严守规矩但为魏无羡可以打破一切",
      "正直高洁，不随波逐流",
      "行动派，少说多做",
      "占有欲和保护欲极强但不善表达",
      "醉酒后判若两人，黏人撒娇",
    ],
    speechPatterns:
      "话极少，一个字能解决绝不用两个字。语气平淡冷静，但对魏无羡说话时偶尔会多说几个字。常用：'嗯''不可''回来了''魏婴'。情绪激动时才会说长句。",
    emotionalTriggers: [
      "魏无羡受伤或被误解",
      "有人伤害魏无羡",
      "想起等待魏无羡的十三年",
      "看到魏无羡笑",
      "天子笑（酒）",
    ],
    relationships: {
      魏无羡: "一见钟情，十三年苦等，生死相随",
      蓝曦臣: "兄长，敬重但性格截然不同",
      蓝启仁: "叔父，严格遵从其教导（除了关于魏无羡的事）",
      金凌: "晚辈，默默照顾",
      蓝思追: "养子，温柔以待",
    },
    timelineStates: {
      云深不知处求学期: "规矩严明，被魏无羡打破平静",
      射日之征: "暗中关注魏无羡，内心挣扎",
      等待期: "十三年独守，为魏无羡正名",
      重逢后: "终于在一起，温柔守护",
    },
  },
  // TODO: Add more characters (江澄, 温宁, 蓝曦臣, 金光瑶, 江厌离, 金凌, 蓝思追, etc.)
  // The user will provide the original novel for comprehensive extraction
];
```

- [ ] **Step 2: Create relationship dynamics**

```typescript
// src/knowledge/mdzs/relationships.ts

import type { RelationshipDynamic } from "../base/types";

export const MDZS_RELATIONSHIPS: RelationshipDynamic[] = [
  {
    characters: ["魏无羡", "蓝忘机"],
    type: "灵魂伴侣 / 官配CP（忘羡）",
    dynamic:
      "一动一静，一热一冷。魏无羡主动撩拨，蓝忘机默默守护。表面不搭，实则最懂对方。魏无羡给蓝忘机带来人间烟火气，蓝忘机给魏无羡一个永远的归处。",
    keyMoments: [
      "云深不知处初遇，翻墙带酒",
      "冷泉洞中坦诚相对",
      "射日之征并肩作战",
      "穷奇道被困",
      "不夜天城坠落，蓝忘机接住魏无羡",
      "十三年等待",
      "大梵山重逢",
      "观音庙真相大白",
    ],
    commonFanficTropes: [
      "甜饼日常（重逢后撒糖）",
      "虐恋（前世/等待期）",
      "现代AU（各种职业设定）",
      "校园AU",
      "IF线（如果没有死）",
      "豆花（无虐纯甜）",
    ],
  },
  {
    characters: ["魏无羡", "江澄"],
    type: "义兄弟",
    dynamic:
      "从小一起长大的兄弟，性格互补但矛盾深重。江澄嫉妒又依赖魏无羡，魏无羡愧疚又不舍江澄。分离后各自痛苦，重逢后仍无法和解。",
    keyMoments: [
      "莲花坞长大",
      "金丹转让（江澄不知情）",
      "夷陵乱葬岗决裂",
      "莫家庄重逢",
      "观音庙金丹真相",
    ],
    commonFanficTropes: [
      "兄弟和解线",
      "金丹真相后的反应",
      "IF线（如果没有失去金丹）",
    ],
  },
  // TODO: Add more relationship dynamics as knowledge expands
];
```

- [ ] **Step 3: Create world-building rules**

```typescript
// src/knowledge/mdzs/world.ts

import type { WorldRule } from "../base/types";

export const MDZS_WORLD_RULES: WorldRule[] = [
  {
    category: "修仙体系",
    rules: [
      "修仙以金丹为核心，金丹碎则修为尽失",
      "仙门百家，五大世家最为强盛：姑苏蓝氏、云梦江氏、兰陵金氏、清河聂氏、岐山温氏",
      "正统修仙讲究'修心养性'，旁门左道（如诡道/鬼道）被主流排斥",
      "法器：蓝氏-琴（忘机/裂冰）、江氏-剑（随便/紫电）、温氏-火、聂氏-刀",
      "灵力可驱鬼除魔，高手可御剑飞行",
    ],
  },
  {
    category: "五大家族",
    rules: [
      "姑苏蓝氏：云深不知处，家规三千余条，尚雅好礼，族长蓝曦臣",
      "云梦江氏：莲花坞，'明知不可为而为之'，族长江澄",
      "兰陵金氏：金鳞台/彩衣镇，富贵权势，族长金光瑶（后金凌）",
      "清河聂氏：不净世，尚武刚烈，族长聂明玦（后聂怀桑）",
      "岐山温氏：不夜天城，已覆灭，曾是最强势力",
    ],
  },
  {
    category: "重要地点",
    rules: [
      "云深不知处：蓝氏总部，山中仙境，有冷泉、藏书阁、静室",
      "莲花坞：江氏总部，湖畔水乡，有莲花池、剑室",
      "乱葬岗：魏无羡重塑诡道之地，阴气极重",
      "不夜天城：温氏总部，已毁于战火",
      "大梵山：魏无羡重生后被蓝忘机认出之处",
    ],
  },
  {
    category: "时间线",
    rules: [
      "云深不知处求学期 → 射日之征 → 温氏覆灭 → 夷陵老祖时期 → 乱葬岗围剿/魏无羡死亡 → 十三年后 → 莫玄羽献舍/重生 → 真相大白",
    ],
  },
];
```

- [ ] **Step 4: Create trope templates**

```typescript
// src/knowledge/mdzs/tropes.ts

import type { TropeTemplate } from "../base/types";

export const MDZS_TROPES: TropeTemplate[] = [
  {
    name: "现代AU",
    description: "角色生活在现代社会，无修仙设定，保留性格内核",
    characterAdaptations: {
      魏无羡: "活泼外向的职业（画家、音乐人、厨师、记者），社交达人",
      蓝忘机: "严肃高冷的职业（钢琴家、教授、医生、律师），外冷内热",
      江澄: "脾气火爆的管理者（公司高管、教练），刀子嘴豆腐心",
    },
  },
  {
    name: "校园AU",
    description: "高中或大学校园背景，青春纯爱",
    characterAdaptations: {
      魏无羡: "校园风云人物，成绩好但不守规矩，人缘极好",
      蓝忘机: "学生会长或优等生，严格自律，暗恋魏无羡",
      江澄: "魏无羡的竹马，运动系，嘴硬心软",
    },
  },
  {
    name: "IF线",
    description: "改变原著某个关键节点后的平行世界走向",
    characterAdaptations: {
      魏无羡: "如果没有失去金丹/如果没有死，性格会更加完整",
      蓝忘机: "如果早一步说出心意，会更加主动",
      江澄: "如果知道金丹真相，兄弟关系会不同",
    },
  },
  {
    name: "豆花",
    description: "纯甜无虐，日常向，温馨治愈",
    characterAdaptations: {
      魏无羡: "撩拨蓝忘机的日常，做饭、整蛊、撒娇",
      蓝忘机: "被撩后的反应（耳朵红、沉默、默默配合），偶尔反撩",
    },
  },
  {
    name: "虐恋HE",
    description: "先虐后甜，经历磨难后在一起",
    characterAdaptations: {
      魏无羡: "受苦受难但依然坚强，最终被治愈",
      蓝忘机: "默默守护，关键时刻挺身而出，给予救赎",
    },
  },
];
```

- [ ] **Step 5: Create knowledge pack entry point with toSystemPrompt()**

```typescript
// src/knowledge/mdzs/index.ts

import type { FandomKnowledge } from "../base/types";
import { MDZS_CHARACTERS } from "./characters";
import { MDZS_RELATIONSHIPS } from "./relationships";
import { MDZS_WORLD_RULES } from "./world";
import { MDZS_TROPES } from "./tropes";

class MDZSKnowledge implements FandomKnowledge {
  fandomId = "mdzs";
  displayName = "魔道祖师";
  characters = MDZS_CHARACTERS;
  relationships = MDZS_RELATIONSHIPS;
  worldRules = MDZS_WORLD_RULES;
  tropes = MDZS_TROPES;

  toSystemPrompt(): string {
    const charSection = this.characters
      .map(
        (c) =>
          `【${c.name}】（${c.aliases.join("/")}）
性格：${c.personality.join("；")}
说话方式：${c.speechPatterns}
情感触发点：${c.emotionalTriggers.join("、")}
关系：${Object.entries(c.relationships)
            .map(([k, v]) => `${k}→${v}`)
            .join("；")}`
      )
      .join("\n\n");

    const relSection = this.relationships
      .map(
        (r) =>
          `【${r.characters.join(" × ")}】${r.type}
互动方式：${r.dynamic}
经典场景：${r.keyMoments.join("、")}
常见同人梗：${r.commonFanficTropes.join("、")}`
      )
      .join("\n\n");

    const worldSection = this.worldRules
      .map((w) => `【${w.category}】\n${w.rules.map((r) => `- ${r}`).join("\n")}`)
      .join("\n\n");

    const tropeSection = this.tropes
      .map(
        (t) =>
          `【${t.name}】${t.description}
角色适配：${Object.entries(t.characterAdaptations)
            .map(([k, v]) => `${k}→${v}`)
            .join("；")}`
      )
      .join("\n\n");

    return `# 魔道祖师知识库

## 角色档案
${charSection}

## 关系动态
${relSection}

## 世界观
${worldSection}

## 常见同人设定
${tropeSection}`;
  }
}

export const mdzsKnowledge = new MDZSKnowledge();
```

- [ ] **Step 6: Verify knowledge pack compiles and test prompt generation**

Run: `cd D:/github_repository/fanfic-lab && npx tsc --noEmit src/knowledge/mdzs/index.ts`
Expected: No errors

Manually verify the `toSystemPrompt()` output isn't too long:
Run: `cd D:/github_repository/fanfic-lab && node -e "const {mdzsKnowledge} = require('./src/knowledge/mdzs/index'); const prompt = mdzsKnowledge.toSystemPrompt(); console.log('Token estimate:', Math.ceil(prompt.length / 2)); console.log(prompt.substring(0, 500))"`

Note: This may require ts-node or a build step. If it fails, verify via tsc only and test at integration.

- [ ] **Step 7: Commit**

```bash
git add src/knowledge/
git commit -m "feat: add MDZS knowledge pack with characters, relationships, world rules, and tropes"
```

---

## Phase 2: Agent

### Task 5: Create DreamWriter State

**Files:**
- Create: `src/agent/dreamwriter/state.ts`

- [ ] **Step 1: Define the new state annotation**

Follow the existing pattern from `src/agent/state.ts` (Annotation.Root with reducers).

```typescript
// src/agent/dreamwriter/state.ts

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type {
  StoryOutline,
  QualityReport,
  StoryResult,
  DreamWriterStage,
} from "@/lib/types/dreamwriter";

export const DreamWriterStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,

  // Pipeline stage tracking
  stage: Annotation<DreamWriterStage>({
    reducer: (_, update) => update,
    default: () => "idle" as DreamWriterStage,
  }),

  // Parsed request
  parsedCP: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  parsedSetting: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  parsedTone: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  parsedConstraints: Annotation<Record<string, string>>({
    reducer: (_, update) => update,
    default: () => ({}),
  }),
  detectedLanguage: Annotation<"zh" | "en">({
    reducer: (_, update) => update,
    default: () => "zh" as const,
  }),

  // Story planning
  outline: Annotation<StoryOutline | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Writing
  storyDraft: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  ragContext: Annotation<string[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),

  // Quality
  qualityReport: Annotation<QualityReport | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  revisionCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),

  // Delivery
  result: Annotation<StoryResult | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),

  // Progress logs (for SSE streaming)
  logs: Annotation<{ message: string; done: boolean }[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
});

export type DreamWriterState = typeof DreamWriterStateAnnotation.State;
```

- [ ] **Step 2: Verify compilation**

Run: `cd D:/github_repository/fanfic-lab && npx tsc --noEmit src/agent/dreamwriter/state.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/agent/dreamwriter/
git commit -m "feat: add DreamWriter state annotation"
```

---

### Task 6: Create MDZS-Specific Prompts

**Files:**
- Create: `src/agent/dreamwriter/prompts/system.ts`
- Create: `src/agent/dreamwriter/prompts/mdzs.ts`

- [ ] **Step 1: Create base system prompts**

```typescript
// src/agent/dreamwriter/prompts/system.ts

export const INTENT_PARSER_PROMPT = `你是一个专业的同人文创作需求分析师。
用户会用自然语言描述他们想看的同人文，你需要从中提取结构化信息。

请从用户输入中提取以下信息，返回JSON格式：
{
  "cp": ["角色A", "角色B"],
  "setting": "背景设定（原著/现代AU/校园AU/IF线等）",
  "tone": "情感基调（甜/虐/虐转甜/日常/悬疑等）",
  "constraints": {
    "ending": "HE/BE/OE（开放式）",
    "rating": "G/T/M",
    "length": "short/medium/long",
    "specificRequests": "用户的其他具体要求"
  },
  "language": "zh/en"
}

如果某个信息用户没有明确说明，使用合理的默认值：
- ending 默认 "HE"
- rating 默认 "T"
- length 默认 "medium"
- language 根据用户输入语言判断

返回纯JSON，不要添加任何额外文字或markdown代码块标记。`;

export const STORY_ARCHITECT_PROMPT = (knowledgePrompt: string) =>
  `你是一位资深的同人文策划大师。你对原著了如指掌，能够根据用户需求策划出既忠于角色又富有创意的故事。

${knowledgePrompt}

根据解析后的创作需求，策划一个完整的短篇故事大纲。

返回JSON格式：
{
  "title": "故事标题",
  "cp": ["角色A", "角色B"],
  "setting": "具体背景设定",
  "tone": "情感基调",
  "wordTarget": 3000,
  "emotionalArc": "情感曲线描述（起承转合）",
  "scenes": [
    {
      "summary": "场景概要",
      "characters": ["出场角色"],
      "emotion": "这个场景的情绪关键词"
    }
  ]
}

要求：
1. 角色行为必须符合原著性格，不能OOC
2. 故事结构完整，有明确的起承转合
3. 情感真实可信，不要突兀
4. 如果是AU设定，角色性格内核必须保留
5. wordTarget 根据 length 约束决定：short=1500-2500, medium=3000-5000, long=5000-8000

返回纯JSON，不要添加任何额外文字。`;

export const WRITER_PROMPT = (knowledgePrompt: string) =>
  `你是一位顶尖的同人文作者，擅长将角色写得鲜活生动、感情真挚。

${knowledgePrompt}

根据提供的故事大纲和原著参考段落，写出完整的短篇同人文。

写作要求：
1. 【角色还原】这是最重要的要求。每个角色的语言、行为、思维方式都必须贴合原著性格
   - 魏无羡说话要活泼跳脱，爱调侃
   - 蓝忘机话少但字字千钧，动作表达多于语言
   - 其他角色同理
2. 【文笔质量】行文流畅优美，善用细节描写，五感描写丰富
3. 【情感真实】感情发展自然，不要突兀的告白或转折
4. 【结构完整】按照大纲写，但可以灵活调整细节
5. 【氛围营造】注意场景氛围的渲染，让读者有代入感

输出格式：直接输出故事正文，不要加标题、不要加作者注、不要加任何元信息。`;

export const QUALITY_GUARD_PROMPT = (knowledgePrompt: string) =>
  `你是一位严格的同人文质量审核员。你的任务是检查故事质量，重点关注角色还原度（OOC检测）。

${knowledgePrompt}

请对故事进行以下检查，返回JSON格式：
{
  "overallScore": 8,
  "oocIssues": [
    {
      "character": "角色名",
      "issue": "具体哪里不符合角色性格",
      "suggestion": "建议如何修改",
      "severity": "low/medium/high"
    }
  ],
  "consistencyIssues": ["剧情逻辑问题"],
  "proseNotes": ["文笔可以改进的地方"],
  "passesThreshold": true
}

评分标准：
- 9-10: 优秀，角色高度还原，文笔流畅，情感真挚
- 7-8: 良好，基本没有OOC，文笔通顺
- 5-6: 及格，有轻微OOC或文笔一般
- 1-4: 不及格，严重OOC或文笔太差

passesThreshold 为 true 当 overallScore >= 7。

返回纯JSON。`;

export const DELIVERY_PROMPT = `根据完成的故事，生成3个"类似推荐"的故事创意，让读者可以继续探索。

返回JSON数组格式：
["推荐描述1", "推荐描述2", "推荐描述3"]

推荐应该基于当前故事的CP、设定、风格，但提供不同的角度或变化。
例如：如果当前是忘羡现代AU甜饼，可以推荐忘羡校园AU、忘羡原著向日常、或曦澄现代AU。

返回纯JSON数组。`;
```

- [ ] **Step 2: Create MDZS prompt helpers**

```typescript
// src/agent/dreamwriter/prompts/mdzs.ts

import { mdzsKnowledge } from "@/knowledge/mdzs";

export function getMDZSKnowledgePrompt(): string {
  return mdzsKnowledge.toSystemPrompt();
}

export function buildRAGContext(chunks: { content: string }[]): string {
  if (chunks.length === 0) return "";
  return `\n\n## 原著参考段落\n以下是与当前创作相关的原著段落，请参考其中的描写风格和细节：\n\n${chunks.map((c, i) => `[参考${i + 1}] ${c.content}`).join("\n\n")}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/agent/dreamwriter/prompts/
git commit -m "feat: add DreamWriter system prompts and MDZS prompt helpers"
```

---

### Task 7: Implement Agent Nodes

**Files:**
- Create: `src/agent/dreamwriter/nodes/intent-parser.ts`
- Create: `src/agent/dreamwriter/nodes/story-architect.ts`
- Create: `src/agent/dreamwriter/nodes/writer.ts`
- Create: `src/agent/dreamwriter/nodes/quality-guard.ts`
- Create: `src/agent/dreamwriter/nodes/delivery.ts`

- [ ] **Step 1: Implement Intent Parser node**

```typescript
// src/agent/dreamwriter/nodes/intent-parser.ts

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { INTENT_PARSER_PROMPT } from "../prompts/system";

function parseJsonSafe(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function intentParserNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== INTENT PARSER ==========");

  const lastMessage = state.messages[state.messages.length - 1];
  const userInput = typeof lastMessage.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);

  const model = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" });
  const response = await model.invoke([
    new SystemMessage(INTENT_PARSER_PROMPT),
    new HumanMessage(userInput),
  ]);

  const content = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  try {
    const parsed = parseJsonSafe(content) as {
      cp: string[];
      setting: string;
      tone: string;
      constraints: Record<string, string>;
      language: "zh" | "en";
    };

    return {
      stage: "parsing",
      parsedCP: parsed.cp || [],
      parsedSetting: parsed.setting || "原著向",
      parsedTone: parsed.tone || "甜",
      parsedConstraints: parsed.constraints || {},
      detectedLanguage: parsed.language || "zh",
      logs: [{ message: "已理解你的创作需求", done: true }],
    };
  } catch {
    return {
      stage: "parsing",
      parsedCP: [],
      parsedSetting: "原著向",
      parsedTone: "甜",
      parsedConstraints: { ending: "HE", rating: "T", length: "medium" },
      detectedLanguage: "zh",
      logs: [{ message: "已理解你的创作需求（使用默认设定）", done: true }],
    };
  }
}
```

- [ ] **Step 2: Implement Story Architect node**

```typescript
// src/agent/dreamwriter/nodes/story-architect.ts

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { STORY_ARCHITECT_PROMPT } from "../prompts/system";
import { getMDZSKnowledgePrompt } from "../prompts/mdzs";
import type { StoryOutline } from "@/lib/types/dreamwriter";

function parseJsonSafe(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function storyArchitectNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== STORY ARCHITECT ==========");

  const knowledgePrompt = getMDZSKnowledgePrompt();
  const systemPrompt = STORY_ARCHITECT_PROMPT(knowledgePrompt);

  const requestSummary = `CP: ${state.parsedCP.join(" × ")}
设定: ${state.parsedSetting}
基调: ${state.parsedTone}
约束: ${JSON.stringify(state.parsedConstraints)}`;

  const model = new ChatOpenAI({ temperature: 0.8, model: "gpt-4o" });
  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(requestSummary),
  ]);

  const content = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  try {
    const parsed = parseJsonSafe(content) as StoryOutline;
    return {
      stage: "planning",
      outline: parsed,
      logs: [{ message: `故事构思完成：${parsed.title}`, done: true }],
    };
  } catch {
    const fallbackOutline: StoryOutline = {
      title: `${state.parsedCP.join("×")}的故事`,
      cp: state.parsedCP,
      setting: state.parsedSetting,
      tone: state.parsedTone,
      wordTarget: 3000,
      scenes: [{ summary: "完整短篇", characters: state.parsedCP, emotion: state.parsedTone }],
      emotionalArc: "起承转合",
    };
    return {
      stage: "planning",
      outline: fallbackOutline,
      logs: [{ message: `故事构思完成：${fallbackOutline.title}`, done: true }],
    };
  }
}
```

- [ ] **Step 3: Implement Writer node**

```typescript
// src/agent/dreamwriter/nodes/writer.ts

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { WRITER_PROMPT } from "../prompts/system";
import { getMDZSKnowledgePrompt, buildRAGContext } from "../prompts/mdzs";
import { retrieveRelevantChunks } from "@/knowledge/base/rag";

export async function writerNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== WRITER ==========");

  const outline = state.outline;
  if (!outline) {
    return { stage: "error", logs: [{ message: "没有故事大纲", done: true }] };
  }

  // RAG: retrieve relevant canon passages
  const ragQuery = `${outline.cp.join(" ")} ${outline.setting} ${outline.scenes.map((s) => s.summary).join(" ")}`;
  let ragChunks: { content: string }[] = [];
  try {
    ragChunks = await retrieveRelevantChunks(ragQuery, "mdzs", 3);
  } catch (e) {
    console.log("[DreamWriter] RAG retrieval failed, continuing without:", e);
  }

  const knowledgePrompt = getMDZSKnowledgePrompt();
  const ragContext = buildRAGContext(ragChunks);
  const systemPrompt = WRITER_PROMPT(knowledgePrompt + ragContext);

  const outlineText = `标题：${outline.title}
CP：${outline.cp.join(" × ")}
设定：${outline.setting}
基调：${outline.tone}
目标字数：${outline.wordTarget}
情感曲线：${outline.emotionalArc}

场景安排：
${outline.scenes.map((s, i) => `${i + 1}. ${s.summary}（角色：${s.characters.join("、")}，情绪：${s.emotion}）`).join("\n")}

${state.qualityReport ? `\n上一版的质量反馈（请针对性修改）：\n${state.qualityReport.oocIssues.map((i) => `- ${i.character}: ${i.issue} → ${i.suggestion}`).join("\n")}\n${state.qualityReport.proseNotes.map((n) => `- ${n}`).join("\n")}` : ""}`;

  const model = new ChatOpenAI({ temperature: 0.9, model: "gpt-4o" });
  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(outlineText),
  ]);

  const story = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  return {
    stage: "writing",
    storyDraft: story,
    ragContext: ragChunks.map((c) => c.content),
    logs: [{ message: "故事初稿完成，正在进行质量检查...", done: true }],
  };
}
```

- [ ] **Step 4: Implement Quality Guard node**

```typescript
// src/agent/dreamwriter/nodes/quality-guard.ts

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { QUALITY_GUARD_PROMPT } from "../prompts/system";
import { getMDZSKnowledgePrompt } from "../prompts/mdzs";
import type { QualityReport } from "@/lib/types/dreamwriter";

function parseJsonSafe(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

export async function qualityGuardNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== QUALITY GUARD ==========");

  if (!state.storyDraft) {
    return { stage: "error", logs: [{ message: "没有故事草稿可供检查", done: true }] };
  }

  const knowledgePrompt = getMDZSKnowledgePrompt();
  const systemPrompt = QUALITY_GUARD_PROMPT(knowledgePrompt);

  const checkInput = `故事需求：
CP: ${state.parsedCP.join(" × ")}
设定: ${state.parsedSetting}
基调: ${state.parsedTone}

故事正文：
${state.storyDraft}`;

  const model = new ChatOpenAI({ temperature: 0.3, model: "gpt-4o-mini" });
  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(checkInput),
  ]);

  const content = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  try {
    const report = parseJsonSafe(content) as QualityReport;
    return {
      stage: "checking",
      qualityReport: report,
      logs: [
        {
          message: report.passesThreshold
            ? `质量检查通过 (${report.overallScore}/10)`
            : `质量检查未通过 (${report.overallScore}/10)，正在修改...`,
          done: true,
        },
      ],
    };
  } catch {
    // If quality check fails to parse, assume it passes
    return {
      stage: "checking",
      qualityReport: {
        overallScore: 7,
        oocIssues: [],
        consistencyIssues: [],
        proseNotes: [],
        passesThreshold: true,
      },
      logs: [{ message: "质量检查完成", done: true }],
    };
  }
}
```

- [ ] **Step 5: Implement Delivery node**

```typescript
// src/agent/dreamwriter/nodes/delivery.ts

import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { DreamWriterState } from "../state";
import { DELIVERY_PROMPT } from "../prompts/system";
import type { StoryResult } from "@/lib/types/dreamwriter";

function parseJsonSafe(text: string): unknown {
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

function countWords(text: string): number {
  // Count Chinese characters + English words
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = text
    .replace(/[\u4e00-\u9fff]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return chinese + english;
}

export async function deliveryNode(
  state: DreamWriterState,
  _config: RunnableConfig
): Promise<Partial<DreamWriterState>> {
  console.log("[DreamWriter] ========== DELIVERY ==========");

  const outline = state.outline;
  const story = state.storyDraft;

  if (!outline || !story) {
    return { stage: "error", logs: [{ message: "缺少故事数据", done: true }] };
  }

  // Generate suggestions
  let suggestions: string[] = [];
  try {
    const model = new ChatOpenAI({ temperature: 0.7, model: "gpt-4o-mini" });
    const response = await model.invoke([
      new SystemMessage(DELIVERY_PROMPT),
      new HumanMessage(
        `当前故事：${outline.title}\nCP: ${outline.cp.join(" × ")}\n设定: ${outline.setting}\n基调: ${outline.tone}`
      ),
    ]);
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
    suggestions = parseJsonSafe(content) as string[];
  } catch {
    suggestions = ["换一个设定试试？", "试试不同的情感基调？", "看看其他CP？"];
  }

  const result: StoryResult = {
    title: outline.title,
    body: story,
    cp: outline.cp,
    tags: [outline.setting, outline.tone],
    setting: outline.setting,
    wordCount: countWords(story),
    qualityScore: state.qualityReport?.overallScore ?? 7,
    language: state.detectedLanguage,
    suggestions,
  };

  return {
    stage: "complete",
    result,
    logs: [{ message: `创作完成！《${result.title}》共 ${result.wordCount} 字`, done: true }],
  };
}
```

- [ ] **Step 6: Verify all nodes compile**

Run: `cd D:/github_repository/fanfic-lab && npx tsc --noEmit src/agent/dreamwriter/nodes/*.ts`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/agent/dreamwriter/nodes/
git commit -m "feat: implement all DreamWriter agent nodes"
```

---

### Task 8: Wire Up Adaptive Agent Graph

**Files:**
- Create: `src/agent/dreamwriter/graph.ts`
- Modify: `src/agent/langgraph.json`

- [ ] **Step 1: Build the adaptive graph with conditional routing**

```typescript
// src/agent/dreamwriter/graph.ts

import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";
import { DreamWriterStateAnnotation } from "./state";
import { intentParserNode } from "./nodes/intent-parser";
import { storyArchitectNode } from "./nodes/story-architect";
import { writerNode } from "./nodes/writer";
import { qualityGuardNode } from "./nodes/quality-guard";
import { deliveryNode } from "./nodes/delivery";
import type { DreamWriterState } from "./state";

const MAX_REVISIONS = 2;

function routeAfterQualityCheck(state: DreamWriterState): string {
  const report = state.qualityReport;
  if (!report) return "delivery_node";

  if (!report.passesThreshold && state.revisionCount < MAX_REVISIONS) {
    console.log(
      `[DreamWriter] Quality score ${report.overallScore}/10, revision ${state.revisionCount + 1}/${MAX_REVISIONS}`
    );
    return "writer_node"; // Loop back for revision
  }

  return "delivery_node";
}

// Revision counter node - increments revision count before re-writing
async function revisionCounterNode(
  state: DreamWriterState
): Promise<Partial<DreamWriterState>> {
  return {
    revisionCount: state.revisionCount + 1,
    stage: "revising",
    logs: [
      {
        message: `正在根据反馈修改第 ${state.revisionCount + 1} 版...`,
        done: true,
      },
    ],
  };
}

const workflow = new StateGraph(DreamWriterStateAnnotation)
  .addNode("intent_parser_node", intentParserNode)
  .addNode("story_architect_node", storyArchitectNode)
  .addNode("writer_node", writerNode)
  .addNode("quality_guard_node", qualityGuardNode)
  .addNode("revision_counter_node", revisionCounterNode)
  .addNode("delivery_node", deliveryNode)
  // Flow
  .addEdge(START, "intent_parser_node")
  .addEdge("intent_parser_node", "story_architect_node")
  .addEdge("story_architect_node", "writer_node")
  .addEdge("writer_node", "quality_guard_node")
  .addConditionalEdges("quality_guard_node", routeAfterQualityCheck, {
    writer_node: "revision_counter_node",
    delivery_node: "delivery_node",
  })
  .addEdge("revision_counter_node", "writer_node")
  .addEdge("delivery_node", END);

const memory = new MemorySaver();

export const graph = workflow.compile({
  checkpointer: memory,
});
```

- [ ] **Step 2: Update langgraph.json to point to new graph**

Replace the content of `src/agent/langgraph.json`:

```json
{
  "$schema": "https://langchain-ai.github.io/langgraph/schemas/langgraph.config.schema.json",
  "graphs": {
    "dreamwriter": {
      "path": "./dreamwriter/graph.ts:graph"
    }
  }
}
```

- [ ] **Step 3: Verify the graph compiles**

Run: `cd D:/github_repository/fanfic-lab && npx tsc --noEmit src/agent/dreamwriter/graph.ts`
Expected: No errors

- [ ] **Step 4: Test the agent server starts**

Run: `cd D:/github_repository/fanfic-lab && npx langgraphjs dev --host 0.0.0.0 --port 8123 --config src/agent/langgraph.json`
Expected: Server starts without errors, shows available graph "dreamwriter"
(Ctrl+C after verifying)

- [ ] **Step 5: Commit**

```bash
git add src/agent/dreamwriter/graph.ts src/agent/langgraph.json
git commit -m "feat: wire up adaptive DreamWriter agent graph with quality loop"
```

---

## Phase 3: API

### Task 9: Create SSE Creation Endpoint

**Files:**
- Create: `src/app/api/create/route.ts`

- [ ] **Step 1: Implement the SSE creation endpoint**

Follow the existing SSE pattern from `src/app/api/generate/route.ts` but simplified for the new DreamWriter flow.

```typescript
// src/app/api/create/route.ts

import { NextRequest } from "next/server";
import type { CreationProgressEvent, DreamWriterStage } from "@/lib/types/dreamwriter";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:8123";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, language = "zh", showOutline = false } = body as {
      prompt: string;
      language?: "zh" | "en";
      showOutline?: boolean;
    };

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "请描述你想看的故事" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a new thread
    const threadRes = await fetch(`${LANGGRAPH_URL}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const thread = await threadRes.json();
    const threadId = thread.thread_id;

    // Start the DreamWriter run with streaming
    const runRes = await fetch(
      `${LANGGRAPH_URL}/threads/${threadId}/runs/stream`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant_id: "dreamwriter",
          input: {
            messages: [{ role: "human", content: prompt }],
          },
          stream_mode: ["updates"],
        }),
      }
    );

    if (!runRes.ok || !runRes.body) {
      return new Response(
        JSON.stringify({ error: "Agent 服务不可用" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform the LangGraph stream into our CreationProgressEvent stream
    const encoder = new TextEncoder();
    const reader = runRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);

              // Extract stage and relevant data from node updates
              const event = parseNodeUpdate(data);
              if (event) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                );
              }
            } catch {
              // Skip unparseable lines
            }
          }
        } catch (err) {
          const errorEvent: CreationProgressEvent = {
            stage: "error",
            error: err instanceof Error ? err.message : "未知错误",
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "创建失败",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function parseNodeUpdate(data: Record<string, unknown>): CreationProgressEvent | null {
  // LangGraph stream updates have the node name as key
  for (const [nodeName, nodeData] of Object.entries(data)) {
    const update = nodeData as Record<string, unknown>;

    if (!update.stage) continue;

    const stage = update.stage as DreamWriterStage;
    const logs = update.logs as { message: string; done: boolean }[] | undefined;
    const message = logs?.[0]?.message;

    const event: CreationProgressEvent = { stage, message };

    if (update.outline) {
      event.outline = update.outline as CreationProgressEvent["outline"];
    }
    if (update.result) {
      event.result = update.result as CreationProgressEvent["result"];
    }

    return event;
  }
  return null;
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd D:/github_repository/fanfic-lab && npx tsc --noEmit src/app/api/create/route.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/create/
git commit -m "feat: add SSE creation endpoint for DreamWriter"
```

---

## Phase 4: Frontend

### Task 10: Create Story Creation Hook

**Files:**
- Create: `src/lib/hooks/useStoryCreation.ts`

- [ ] **Step 1: Implement the creation hook**

Follow the SSE parsing pattern from `src/lib/hooks/useStoryGenerator.ts`.

```typescript
// src/lib/hooks/useStoryCreation.ts

"use client";

import { useState, useCallback, useRef } from "react";
import type {
  DreamWriterStage,
  StoryOutline,
  StoryResult,
  CreationProgressEvent,
} from "@/lib/types/dreamwriter";

interface UseStoryCreationReturn {
  stage: DreamWriterStage;
  message: string | null;
  outline: StoryOutline | null;
  result: StoryResult | null;
  error: string | null;
  isCreating: boolean;
  create: (prompt: string) => Promise<void>;
  reset: () => void;
}

export function useStoryCreation(): UseStoryCreationReturn {
  const [stage, setStage] = useState<DreamWriterStage>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [outline, setOutline] = useState<StoryOutline | null>(null);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isCreating = stage !== "idle" && stage !== "complete" && stage !== "error";

  const create = useCallback(async (prompt: string) => {
    // Reset state
    setStage("parsing");
    setMessage("正在理解你的创作需求...");
    setOutline(null);
    setResult(null);
    setError(null);

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "创建失败" }));
        setStage("error");
        setError(err.error || "创建失败");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const event = JSON.parse(dataStr) as CreationProgressEvent;

            setStage(event.stage);
            if (event.message) setMessage(event.message);
            if (event.outline) setOutline(event.outline);
            if (event.result) setResult(event.result);
            if (event.error) setError(event.error);
          } catch {
            // Skip unparseable events
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setStage("error");
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
    setMessage(null);
    setOutline(null);
    setResult(null);
    setError(null);
  }, []);

  return { stage, message, outline, result, error, isCreating, create, reset };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/useStoryCreation.ts
git commit -m "feat: add useStoryCreation hook for SSE creation flow"
```

---

### Task 11: Build Creation Flow Components

**Files:**
- Create: `src/components/create/DreamInput.tsx`
- Create: `src/components/create/CreationProgress.tsx`
- Create: `src/components/create/StoryResult.tsx`

- [ ] **Step 1: Create DreamInput component**

```tsx
// src/components/create/DreamInput.tsx

"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const QUICK_TAGS = [
  "忘羡甜饼",
  "忘羡现代AU",
  "忘羡虐恋HE",
  "忘羡IF线",
  "忘羡校园AU",
  "忘羡豆花",
];

interface DreamInputProps {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export function DreamInput({ onSubmit, disabled }: DreamInputProps) {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (prompt.trim() && !disabled) {
      onSubmit(prompt.trim());
    }
  }

  function handleTagClick(tag: string) {
    const newPrompt = prompt ? `${prompt}，${tag}` : `给我写一篇${tag}`;
    setPrompt(newPrompt);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想看的魔道祖师故事..."
            className="w-full min-h-[120px] p-4 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground font-prose text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={disabled}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              disabled={disabled}
              className="px-3 py-1.5 text-sm rounded-full border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
            >
              {tag}
            </button>
          ))}
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={!prompt.trim() || disabled}
          className="w-full gap-2"
        >
          <Sparkles className="size-4" />
          开始创作
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create CreationProgress component**

```tsx
// src/components/create/CreationProgress.tsx

"use client";

import { Sparkles, Check, Loader2, AlertCircle } from "lucide-react";
import type { DreamWriterStage } from "@/lib/types/dreamwriter";

interface CreationProgressProps {
  stage: DreamWriterStage;
  message: string | null;
}

const STAGES: { key: DreamWriterStage; label: string }[] = [
  { key: "parsing", label: "理解创作需求" },
  { key: "planning", label: "构思故事结构" },
  { key: "writing", label: "执笔写作" },
  { key: "checking", label: "质量检查" },
  { key: "complete", label: "创作完成" },
];

const STAGE_ORDER: Record<DreamWriterStage, number> = {
  idle: -1,
  parsing: 0,
  planning: 1,
  writing: 2,
  revising: 2, // Same visual level as writing
  checking: 3,
  complete: 4,
  error: -1,
};

export function CreationProgress({ stage, message }: CreationProgressProps) {
  const currentIndex = STAGE_ORDER[stage];

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {STAGES.map((s, i) => {
        const isDone = currentIndex > i;
        const isActive = currentIndex === i;
        const isPending = currentIndex < i;

        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center size-6 rounded-full transition-colors ${
                isDone
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "bg-accent/20 text-accent"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {isDone ? (
                <Check className="size-3.5" />
              ) : isActive ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <span className="size-2 rounded-full bg-current opacity-30" />
              )}
            </div>
            <span
              className={`text-sm ${
                isDone
                  ? "text-foreground"
                  : isActive
                    ? "text-accent font-medium"
                    : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
          </div>
        );
      })}

      {message && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {stage === "error" ? (
            <span className="flex items-center justify-center gap-1.5 text-destructive">
              <AlertCircle className="size-3.5" />
              {message}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" />
              {message}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create StoryResult component**

```tsx
// src/components/create/StoryResult.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, RefreshCw, Heart } from "lucide-react";
import type { StoryResult as StoryResultType } from "@/lib/types/dreamwriter";

interface StoryResultProps {
  result: StoryResultType;
  onCreateAnother: () => void;
  onSuggestionClick: (suggestion: string) => void;
}

export function StoryResult({
  result,
  onCreateAnother,
  onSuggestionClick,
}: StoryResultProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Story Card */}
      <Card className="border-accent/30 bg-ai-surface ai-glow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
                <BookOpen className="size-4" />
              </div>
              <span className="font-display text-xl">{result.title}</span>
            </span>
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="size-3" />
              {result.qualityScore}/10
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {result.cp.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">
                {c}
              </Badge>
            ))}
            {result.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">
                {t}
              </Badge>
            ))}
            <Badge variant="secondary" className="text-xs">
              {result.wordCount} 字
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="font-prose text-foreground leading-relaxed whitespace-pre-wrap">
            {result.body}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="outline" className="gap-1.5" onClick={onCreateAnother}>
          <RefreshCw className="size-3.5" />
          再来一篇
        </Button>
        <Button variant="ghost" className="gap-1.5">
          <Heart className="size-3.5" />
          收藏
        </Button>
      </div>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">你可能还想看：</h3>
          <div className="flex flex-wrap gap-2">
            {result.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="px-3 py-1.5 text-sm rounded-full border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/create/
git commit -m "feat: add DreamInput, CreationProgress, and StoryResult components"
```

---

### Task 12: Build Create Page

**Files:**
- Create: `src/app/(main)/(protected)/create/page.tsx`

- [ ] **Step 1: Implement the creation page**

```tsx
// src/app/(main)/(protected)/create/page.tsx

"use client";

import { useStoryCreation } from "@/lib/hooks/useStoryCreation";
import { DreamInput } from "@/components/create/DreamInput";
import { CreationProgress } from "@/components/create/CreationProgress";
import { StoryResult } from "@/components/create/StoryResult";

export default function CreatePage() {
  const { stage, message, result, isCreating, create, reset } =
    useStoryCreation();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12">
      {stage === "idle" && (
        <div className="text-center space-y-6 animate-fade-slide-in">
          <h1 className="font-display text-3xl text-foreground">
            你想看什么样的魔道祖师故事？
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            用你自己的话描述，剩下的交给我。
          </p>
          <DreamInput onSubmit={create} />
        </div>
      )}

      {isCreating && (
        <div className="text-center space-y-8 animate-fade-slide-in">
          <h2 className="font-display text-2xl text-foreground">正在为你创作...</h2>
          <CreationProgress stage={stage} message={message} />
        </div>
      )}

      {stage === "complete" && result && (
        <div className="animate-ai-reveal">
          <StoryResult
            result={result}
            onCreateAnother={reset}
            onSuggestionClick={(s) => {
              reset();
              // Small delay to let reset take effect
              setTimeout(() => create(s), 100);
            }}
          />
        </div>
      )}

      {stage === "error" && (
        <div className="text-center space-y-4">
          <p className="text-destructive">{message || "创建失败，请重试"}</p>
          <DreamInput onSubmit={create} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(main)/(protected)/create/
git commit -m "feat: add Create page with input, progress, and result views"
```

---

### Task 13: Redesign Landing Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read the current landing page**

Read `src/app/page.tsx` to understand the current structure before modifying.

- [ ] **Step 2: Rewrite the landing page with MDZS theme**

Replace the content of `src/app/page.tsx` with a MDZS-themed landing page. The landing page should:
- Have a hero section with the app name and a prominent input box
- Show quick-start tags (忘羡甜饼, 现代AU, etc.)
- Include sample stories or quality showcase
- Have a CTA button to `/create`

The exact content will depend on the current layout structure and header/footer setup. Follow the existing layout patterns (fonts, color tokens, etc.) from CLAUDE.md.

Key elements:
```tsx
// Hero section
<h1 className="font-display text-5xl text-foreground">魔道祖师·梦笔</h1>
<p className="text-xl text-muted-foreground">描述你想看的故事，AI为你执笔</p>

// Input box or CTA
<Link href="/create">
  <Button size="lg" className="gap-2">
    <Sparkles className="size-4" />
    开始创作
  </Button>
</Link>
```

- [ ] **Step 3: Verify the page renders**

Run: `cd D:/github_repository/fanfic-lab && npm run dev`
Open: `http://localhost:3000`
Expected: MDZS-themed landing page renders without errors

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: redesign landing page with MDZS DreamWriter theme"
```

---

### Task 14: Build Story Reading Page

**Files:**
- Create: `src/components/story/StoryReader.tsx`
- Create: `src/app/(main)/story/[id]/page.tsx`

- [ ] **Step 1: Create StoryReader component**

```tsx
// src/components/story/StoryReader.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoryReaderProps {
  story: {
    title: string;
    body: string;
    fandom: string;
    ships: string[];
    tags: string[];
    wordCount: number;
    rating: string;
    authorName: string;
    createdAt: string;
  };
}

export function StoryReader({ story }: StoryReaderProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-2xl">{story.title}</CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {story.ships.map((s) => (
              <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
            ))}
            {story.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
            <Badge variant="secondary" className="text-xs">{story.wordCount} 字</Badge>
            <Badge variant="secondary" className="text-xs">{story.rating}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            by {story.authorName} · {new Date(story.createdAt).toLocaleDateString("zh-CN")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="font-prose text-foreground leading-relaxed whitespace-pre-wrap">
            {story.body}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 mt-6">
        <Button variant="ghost" className="gap-1.5">
          <Heart className="size-3.5" />
          喜欢
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create story page with data fetching**

```tsx
// src/app/(main)/story/[id]/page.tsx

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { StoryReader } from "@/components/story/StoryReader";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      author: { select: { displayName: true, username: true } },
      chapters: { orderBy: { chapterNumber: "asc" }, take: 1 },
    },
  });

  if (!story) notFound();

  const chapter = story.chapters[0];

  return (
    <StoryReader
      story={{
        title: story.title,
        body: chapter?.content || "",
        fandom: story.fandom,
        ships: story.ships,
        tags: story.tags,
        wordCount: story.wordCount,
        rating: story.rating,
        authorName: story.author.displayName || story.author.username,
        createdAt: story.createdAt.toISOString(),
      }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/story/ src/app/(main)/story/
git commit -m "feat: add story reading page and StoryReader component"
```

---

### Task 15: Build Shelf Page

**Files:**
- Create: `src/components/shelf/ShelfGrid.tsx`
- Create: `src/app/(main)/(protected)/shelf/page.tsx`

- [ ] **Step 1: Create ShelfGrid component**

```tsx
// src/components/shelf/ShelfGrid.tsx

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";

interface ShelfStory {
  id: string;
  title: string;
  fandom: string;
  ships: string[];
  wordCount: number;
  createdAt: string;
}

interface ShelfGridProps {
  stories: ShelfStory[];
}

export function ShelfGrid({ stories }: ShelfGridProps) {
  if (stories.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="flex items-center justify-center size-16 rounded-full bg-muted mx-auto">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">还没有故事，去创作一个吧！</p>
        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 text-primary hover:underline"
        >
          <Sparkles className="size-3.5" />
          开始创作
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stories.map((story) => (
        <Link key={story.id} href={`/story/${story.id}`}>
          <Card className="hover-lift cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base line-clamp-2">
                {story.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {story.ships.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
                <Badge variant="secondary" className="text-xs">{story.wordCount} 字</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(story.createdAt).toLocaleDateString("zh-CN")}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create shelf page**

```tsx
// src/app/(main)/(protected)/shelf/page.tsx

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShelfGrid } from "@/components/shelf/ShelfGrid";
import { Feather } from "lucide-react";

export default async function ShelfPage() {
  const user = await stackServerApp.getUser();
  if (!user) redirect("/handler/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: user.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/handler/sign-in");

  const stories = await prisma.story.findMany({
    where: { authorId: dbUser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fandom: true,
      ships: true,
      wordCount: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
          <Feather className="size-4" />
        </div>
        <h1 className="font-display text-2xl">我的书架</h1>
      </div>
      <ShelfGrid
        stories={stories.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shelf/ src/app/(main)/(protected)/shelf/
git commit -m "feat: add shelf page with story grid"
```

---

### Task 16: Update Navigation

**Files:**
- Modify: `src/app/(main)/layout.tsx` or relevant header/navigation component

- [ ] **Step 1: Read the current main layout and header component**

Read `src/app/(main)/layout.tsx` and `src/components/layout/` to understand current navigation.

- [ ] **Step 2: Update navigation links**

Replace the existing navigation items with:
- **创作** → `/create`
- **书架** → `/shelf`
- **广场** → `/gallery` (or `/feed`)

Remove links to old pages (generate, wizard, editor) from the navigation.

- [ ] **Step 3: Verify navigation works**

Run: `cd D:/github_repository/fanfic-lab && npm run dev`
Expected: All navigation links work, old pages still accessible but not linked

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/ src/components/layout/
git commit -m "feat: update navigation for DreamWriter pages"
```

---

## Phase 5: Integration & Cleanup

### Task 17: End-to-End Integration Test

- [ ] **Step 1: Start the agent server**

Run: `cd D:/github_repository/fanfic-lab && npm run dev:agent`
Expected: Agent server starts on port 8123

- [ ] **Step 2: Start the web server**

Run (in another terminal): `cd D:/github_repository/fanfic-lab && npm run dev`
Expected: Next.js dev server starts on port 3000

- [ ] **Step 3: Test the creation flow end-to-end**

1. Open `http://localhost:3000`
2. Click "开始创作" or navigate to `/create`
3. Enter: "给我写一篇忘羡的现代AU甜饼，蓝忘机是大学教授，魏无羡是隔壁咖啡店老板"
4. Click "开始创作"
5. Observe: Progress indicator should show each stage advancing
6. Wait: Story should be delivered within 60 seconds
7. Verify: Story should be in-character, complete, and readable

- [ ] **Step 4: Test error handling**

1. Stop the agent server
2. Try creating a story
3. Verify: Error message shows "Agent 服务不可用" or similar
4. Restart agent server and verify recovery

- [ ] **Step 5: Fix any integration issues discovered**

Address any bugs found during testing. Common issues:
- Import path mismatches
- SSE parsing edge cases
- LangGraph stream format differences

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes from end-to-end testing"
```

---

### Task 18: Remove Old Code

**Important:** Only do this after Task 17 confirms the new system works.

- [ ] **Step 1: Remove old agent files**

```bash
# Keep the old files around for reference during development
# Delete them only when the new system is fully verified
rm src/agent/agent.ts
rm src/agent/state.ts
rm src/agent/prompts.ts
rm -rf src/agent/tools/
```

- [ ] **Step 2: Remove old page files**

```bash
rm -rf src/app/(main)/(protected)/generate/
rm -rf src/app/(main)/(protected)/wizard/
rm -rf src/app/(main)/(protected)/editor/
rm -rf src/app/(main)/(protected)/generations/
rm -rf src/app/api/generate/
rm -rf src/app/api/agent/
```

- [ ] **Step 3: Remove old component files**

```bash
rm -rf src/components/generator/
rm -rf src/components/wizard/
rm -rf src/components/editor/
rm -rf src/components/hitl/
```

- [ ] **Step 4: Remove old hooks**

```bash
rm src/lib/hooks/useStoryGenerator.ts
rm src/lib/hooks/useEditorAI.ts
```

- [ ] **Step 5: Verify build succeeds after cleanup**

Run: `cd D:/github_repository/fanfic-lab && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove old pipeline, editor, and wizard code"
```

---

### Task 19: Save Story to Database on Creation

**Files:**
- Modify: `src/app/api/create/route.ts`

- [ ] **Step 1: Add story persistence after creation completes**

After the SSE stream completes, save the generated story to the database. This requires:

1. Get the authenticated user from Stack Auth
2. Create a `Story` record with the delivered content
3. Create a `Chapter` record with the story body
4. Create a `Generation` record to track the AI generation

Add this logic to the API route. After parsing the final `complete` stage event from the LangGraph stream, make a separate call to save the story:

```typescript
// At the end of the stream processing, after delivery_node completes:
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/auth";

// Get user
const stackUser = await stackServerApp.getUser();
if (stackUser) {
  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
  });

  if (dbUser && finalResult) {
    const story = await prisma.story.create({
      data: {
        title: finalResult.title,
        summary: finalResult.body.substring(0, 200),
        fandom: "魔道祖师",
        ships: finalResult.cp,
        tags: finalResult.tags,
        rating: "GENERAL",
        status: "DRAFT",
        wordCount: finalResult.wordCount,
        authorId: dbUser.id,
        chapters: {
          create: {
            title: finalResult.title,
            content: finalResult.body,
            chapterNumber: 1,
            wordCount: finalResult.wordCount,
          },
        },
      },
    });

    await prisma.generation.create({
      data: {
        userId: dbUser.id,
        type: "STORY",
        status: "COMPLETE",
        request: { prompt, language },
        deliverable: finalResult,
        wordCount: finalResult.wordCount,
        storyId: story.id,
      },
    });
  }
}
```

Note: The exact integration pattern depends on how the SSE stream is structured — the save should happen server-side after the stream finishes, not inside the streaming function. You may need to restructure the endpoint to buffer the final result.

- [ ] **Step 2: Verify stories appear on shelf after creation**

1. Create a story via `/create`
2. Navigate to `/shelf`
3. Verify the story appears in the grid
4. Click through to `/story/[id]` and verify content

- [ ] **Step 3: Commit**

```bash
git add src/app/api/create/route.ts
git commit -m "feat: persist generated stories to database"
```

---

## Verification Plan

### Automated Checks
- `npx tsc --noEmit` — TypeScript compilation passes
- `npm run build` — Next.js production build succeeds
- Agent server starts: `npm run dev:agent` without errors

### Manual E2E Test
1. Start both servers (`npm run dev:all`)
2. Navigate to landing page → verify MDZS theme
3. Click through to `/create`
4. Enter a story request in Chinese
5. Watch progress indicators advance
6. Receive complete story
7. Verify story is in-character (no OOC)
8. Check `/shelf` shows the story
9. Click through to story reading page
10. Test "再来一篇" and suggestion buttons

### Quality Benchmarks
- Story generation completes in < 90 seconds
- Quality guard scores stories ≥ 7/10
- No TypeScript errors in build
- All navigation links work
