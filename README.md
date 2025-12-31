# FanFic Lab

An AI-powered fanfiction writing platform built with **Next.js 15**, **CopilotKit**, and **LangGraph.js**. Create amazing fanfiction with an AI assistant that understands your characters, respects canon, and helps bring your stories to life.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8)
![CopilotKit](https://img.shields.io/badge/CopilotKit-1.8-purple)
![LangGraph](https://img.shields.io/badge/LangGraph.js-0.3-green)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [CopilotKit Integration](#copilotkit-integration)
- [LangGraph Agent](#langgraph-agent)
- [Components](#components)
- [API Routes](#api-routes)
- [Deployment](#deployment)

## Overview

FanFic Lab is designed for the fanfiction community, providing:

- **Smart Editor** - AI-powered writing assistance with inline suggestions
- **Creative Wizard** - Conversational story setup with Human-in-the-Loop (HITL) forms
- **Fandom Feed** - Discover and filter stories by fandom, ships, and tags
- **Character Management** - Track characters and detect out-of-character moments
- **Image Generation** - AI-generated character portraits and scene illustrations

```mermaid
graph TB
    subgraph "User Interface"
        A[Homepage] --> B[Creative Wizard]
        A --> C[Smart Editor]
        A --> D[Fandom Feed]
        B --> C
    end

    subgraph "AI Layer"
        E[CopilotKit Provider]
        F[LangGraph Agent]
        G[OpenAI GPT-4o]
    end

    subgraph "Backend"
        H[Next.js API Routes]
        I[Prisma ORM]
        J[Neon PostgreSQL]
    end

    C --> E
    B --> E
    E --> H
    H --> F
    F --> G
    H --> I
    I --> J
```

## Features

### Phase 2: Smart Editor MVP

| Feature | Description |
|---------|-------------|
| CopilotTextarea | Inline AI suggestions while typing |
| Magic Continue | AI writes the next 200-300 words naturally |
| Expand Text | Enhance selected text with more dialogue/description/emotion |
| Polish Prose | Improve writing quality at light/medium/deep levels |
| Autosave | Automatic saving with debounce to localStorage |
| HITL Approval | Review and approve/edit AI-generated content |

### Phase 3: Character & OOC System

| Feature | Description |
|---------|-------------|
| Character Sidebar | Add/manage characters with personality traits |
| OOC Detection | AI checks for out-of-character moments |
| Character Profiles | Name, fandom, personality, speech patterns |
| Original Characters | Support for OCs with custom definitions |

### Phase 4: Creative Wizard

| Feature | Description |
|---------|-------------|
| Fandom Selector | Browse popular fandoms or enter custom |
| Ship Builder | Define romantic pairings with suggestions |
| Character Setup | Add characters with AI suggestions |
| Outline Generation | AI creates story outline for approval |
| Step Progress | Visual progress tracking through wizard |

### Phase 5: Image Generation

| Feature | Description |
|---------|-------------|
| Image Approval Card | Review AI-generated images before saving |
| Image Gallery | Browse portraits, illustrations, covers |
| Prompt Editing | Modify prompts and regenerate |

### Phase 6: Fandom Feed

| Feature | Description |
|---------|-------------|
| Story Cards | Display story info with metadata |
| Tag Filtering | Filter by relationship, setting, tone, content |
| Fandom Tabs | Quick navigation between fandoms |
| Rating/Status Filters | Filter by age rating and completion status |
| Sorting | Sort by recent, popular, comments, word count |

## Tech Stack

```mermaid
graph LR
    subgraph "Frontend"
        A[Next.js 15] --> B[React 19]
        B --> C[TailwindCSS 4]
        C --> D[shadcn/ui]
    end

    subgraph "AI Framework"
        E[CopilotKit] --> F[LangGraph.js]
        F --> G[OpenAI GPT-4o]
    end

    subgraph "Database"
        H[Prisma 7] --> I[Neon PostgreSQL]
    end

    subgraph "Auth"
        J[Stack Auth]
    end

    subgraph "Deployment"
        K[Vercel]
    end
```

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, TailwindCSS 4, shadcn/ui |
| AI | CopilotKit 1.8, LangGraph.js 0.3 |
| LLM | OpenAI GPT-4o |
| Database | Neon PostgreSQL + Prisma 7 |
| Auth | Stack Auth (Neon integration) |
| Deployment | Vercel (serverless) |

## Architecture

### Application Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (React)
    participant CK as CopilotKit
    participant API as /api/copilotkit
    participant LG as LangGraph Agent
    participant AI as OpenAI

    U->>FE: Type in CopilotTextarea
    FE->>CK: Request suggestions
    CK->>API: POST /api/copilotkit
    API->>LG: Route to fanfic_agent
    LG->>AI: Generate text
    AI-->>LG: Response
    LG-->>API: Formatted response
    API-->>CK: Stream response
    CK-->>FE: Display suggestions
    FE-->>U: Show inline suggestions
```

### HITL (Human-in-the-Loop) Pattern

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant CK as CopilotKit
    participant Agent as LangGraph Agent

    Agent->>CK: renderAndWaitForResponse
    CK->>FE: Render HITL Component
    FE->>U: Display form/card
    U->>FE: Make selection
    FE->>CK: respond({ data })
    CK->>Agent: Continue with user input
```

## Project Structure

```
fanfic-lab/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── copilotkit/
│   │   │       └── route.ts          # CopilotKit runtime endpoint
│   │   ├── handler/
│   │   │   └── [...stack]/
│   │   │       └── page.tsx          # Stack Auth handler
│   │   ├── (main)/
│   │   │   ├── layout.tsx            # Main layout wrapper
│   │   │   ├── editor/
│   │   │   │   └── page.tsx          # Smart Editor page
│   │   │   ├── wizard/
│   │   │   │   └── page.tsx          # Creative Wizard page
│   │   │   └── feed/
│   │   │       └── page.tsx          # Fandom Feed page
│   │   ├── layout.tsx                # Root layout with providers
│   │   ├── page.tsx                  # Homepage
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── collapsible.tsx
│   │   │   └── select.tsx
│   │   │
│   │   ├── editor/
│   │   │   ├── SmartEditor.tsx       # Main editor with CopilotTextarea
│   │   │   ├── AIToolbar.tsx         # Magic Continue, Expand, Polish
│   │   │   ├── CharacterSidebar.tsx  # Character management
│   │   │   ├── OOCChecker.tsx        # OOC detection display
│   │   │   ├── ImageGallery.tsx      # Image browsing
│   │   │   └── index.ts
│   │   │
│   │   ├── wizard/
│   │   │   ├── FandomSelector.tsx    # Fandom picker with search
│   │   │   ├── ShipBuilder.tsx       # Ship/pairing selector
│   │   │   ├── CharacterSetup.tsx    # Character configuration
│   │   │   └── index.ts
│   │   │
│   │   ├── feed/
│   │   │   ├── StoryCard.tsx         # Story display card
│   │   │   ├── TagFilter.tsx         # Tag-based filtering
│   │   │   ├── FandomTabs.tsx        # Fandom navigation
│   │   │   └── index.ts
│   │   │
│   │   ├── hitl/
│   │   │   ├── ContentApprovalCard.tsx   # Content review card
│   │   │   ├── OutlineApprovalCard.tsx   # Outline review card
│   │   │   ├── ImageApprovalCard.tsx     # Image review card
│   │   │   └── index.ts
│   │   │
│   │   └── providers/
│   │       ├── CopilotProvider.tsx   # CopilotKit wrapper
│   │       └── StackProvider.tsx     # Stack Auth wrapper
│   │
│   ├── agent/
│   │   ├── agent.ts                  # LangGraph workflow definition
│   │   ├── state.ts                  # Agent state annotation
│   │   └── tools/
│   │       ├── story-tools.ts        # continueStory, expandScene, etc.
│   │       ├── character-tools.ts    # createCharacter, checkOOC
│   │       └── image-tools.ts        # generatePortrait, etc.
│   │
│   ├── lib/
│   │   ├── types/
│   │   │   └── agent-state.ts        # TypeScript interfaces
│   │   ├── hooks/
│   │   │   ├── useAutosave.ts        # Autosave hook
│   │   │   └── index.ts
│   │   ├── storage/
│   │   │   └── draft-storage.ts      # localStorage utilities
│   │   ├── stack.ts                  # Stack Auth server config
│   │   ├── stack-client.ts           # Stack Auth client config
│   │   └── utils.ts
│   │
│   └── middleware.ts                 # Auth middleware
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── prisma.config.ts              # Prisma 7 configuration
│
├── .env.example                      # Environment template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database (Neon recommended)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/ChanMeng666/fanfic-lab.git
cd fanfic-lab

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Development Commands

```bash
npm run dev      # Start dev server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Stack Auth
STACK_SECRET_SERVER_KEY=ssk_...
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_...

# OpenAI
OPENAI_API_KEY=sk-...

# LangGraph (optional, for external agent)
LANGGRAPH_URL=http://localhost:8123
```

## Database Schema

```mermaid
erDiagram
    User ||--o{ Story : writes
    User ||--o{ Character : creates
    Story ||--o{ Chapter : contains
    Story ||--o{ StoryCharacter : features
    Story ||--o{ Like : receives
    Story ||--o{ Comment : has
    Character ||--o{ StoryCharacter : appears_in
    Story ||--o{ Image : includes

    User {
        string id PK
        string email
        string username
        string avatarUrl
    }

    Story {
        string id PK
        string title
        string summary
        string fandom
        string[] ships
        string[] tags
        enum rating
        enum status
        int wordCount
    }

    Chapter {
        string id PK
        string title
        text content
        int chapterNumber
        int wordCount
    }

    Character {
        string id PK
        string name
        string fandom
        string[] personality
        string speechPattern
        boolean isOriginal
        string portraitUrl
    }

    Image {
        string id PK
        string url
        enum type
        string prompt
    }
```

## CopilotKit Integration

### Provider Setup

```tsx
// src/components/providers/CopilotProvider.tsx
<CopilotKit
  runtimeUrl="/api/copilotkit"
  agent="fanfic_agent"
>
  {children}
</CopilotKit>
```

### useCopilotReadable

Provides context to the AI:

```tsx
useCopilotReadable({
  description: "Current story being edited",
  value: {
    fandom: storyContext.fandom,
    ships: storyContext.ships,
    characters: storyContext.characters,
    tone: storyContext.tone,
  },
});
```

### useCopilotAction

Defines AI-callable actions with UI rendering:

```tsx
useCopilotAction({
  name: "continue_story",
  description: "Continue the story from where the user left off",
  parameters: [
    { name: "continuation", type: "string", required: true },
  ],
  handler: async ({ continuation }) => {
    setPendingContent({ type: "continuation", content: continuation });
  },
  render: ({ status }) => {
    if (status === "inProgress") {
      return <LoadingSpinner />;
    }
    return <></>;
  },
});
```

### HITL with renderAndWaitForResponse

```tsx
useCopilotAction({
  name: "gather_fandom_info",
  parameters: [],
  renderAndWaitForResponse: ({ respond }) => (
    <FandomSelector
      onSelect={(fandom) => {
        respond?.({ fandom });
      }}
    />
  ),
});
```

### useCopilotChat

Send messages to the AI:

```tsx
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";

const { appendMessage } = useCopilotChat();

await appendMessage(
  new TextMessage({
    role: Role.User,
    content: "Continue the story...",
  })
);
```

## LangGraph Agent

### Agent State

```typescript
// src/lib/types/agent-state.ts
export interface StoryContext {
  fandom: string;
  ships: string[];
  tags: string[];
  plotPoints: string[];
  currentChapter: number;
  characters: StoryCharacter[];
  tone: string;
}

export interface FanficAgentState {
  storyContext: StoryContext;
  editorContent: string;
  pendingContent: PendingContent | null;
  oocCheckResults: OOCCheckResult[];
  generatedImages: GeneratedImage[];
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `continueStory` | Generate next story segment |
| `expandScene` | Expand selected text with detail |
| `polishProse` | Improve writing quality |
| `generateOutline` | Create story outline |
| `createCharacter` | Define character profile |
| `checkOOC` | Detect out-of-character moments |
| `suggestDialogue` | Generate character dialogue |
| `generateCharacterPortrait` | AI portrait image |
| `generateSceneIllustration` | AI scene image |
| `generateStoryCover` | AI cover image |

### Agent Workflow

```mermaid
graph TD
    A[Start] --> B{Has Tool Call?}
    B -->|Yes| C[Route to Tool]
    B -->|No| D[Generate Response]

    C --> E{Tool Type}
    E -->|Story| F[story-tools]
    E -->|Character| G[character-tools]
    E -->|Image| H[image-tools]

    F --> I[Execute Tool]
    G --> I
    H --> I

    I --> J[Return Result]
    D --> J
    J --> K[End]
```

## Components

### Editor Components

| Component | Purpose |
|-----------|---------|
| `SmartEditor` | Main editor with CopilotTextarea, AI actions |
| `AIToolbar` | Toolbar with Magic Continue, Expand, Polish |
| `CharacterSidebar` | Character management panel |
| `OOCChecker` | Display OOC detection results |
| `ImageGallery` | Browse and manage images |

### Wizard Components

| Component | Purpose |
|-----------|---------|
| `FandomSelector` | Pick fandom with search and categories |
| `ShipBuilder` | Define romantic pairings |
| `CharacterSetup` | Configure characters |

### Feed Components

| Component | Purpose |
|-----------|---------|
| `StoryCard` | Display story with metadata |
| `TagFilter` | Filter by tags, rating, status |
| `FandomTabs` | Navigate between fandoms |

### HITL Components

| Component | Purpose |
|-----------|---------|
| `ContentApprovalCard` | Review AI-generated text |
| `OutlineApprovalCard` | Review story outline |
| `ImageApprovalCard` | Review generated images |

## API Routes

### POST /api/copilotkit

CopilotKit runtime endpoint that routes requests to the LangGraph agent.

```typescript
const runtime = new CopilotRuntime({
  agents: {
    fanfic_agent: new LangGraphHttpAgent({
      url: `${LANGGRAPH_URL}/agents/fanfic_agent`,
    }),
  },
});
```

### GET/POST /handler/[...stack]

Stack Auth handler for authentication flows (sign-in, sign-up, sign-out).

## Deployment

### Vercel Deployment

1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Enable integrations:
   - Neon PostgreSQL
   - Stack Auth
   - Vercel Blob (optional)
   - Vercel KV (optional)

### Build Configuration

```json
{
  "build": "prisma generate && next build",
  "postinstall": "prisma generate"
}
```

### Serverless Configuration

```typescript
// src/app/api/copilotkit/route.ts
export const maxDuration = 60; // 60 second timeout
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

Built with love for the fanfiction community. AI-powered, community-driven.
