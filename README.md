<div align="center"><a name="readme-top"></a>

<img src="https://readme-typing-svg.herokuapp.com?font=Cormorant+Garamond&weight=700&size=45&pause=1000&color=2DD4BF&center=true&vCenter=true&random=false&width=600&height=80&lines=%E2%9C%A8+FanFic+Lab+%E2%9C%A8" alt="FanFic Lab" />

<h3>AI-Powered Fanfiction Writing Platform</h3>

An innovative AI-powered fanfiction writing platform built with **Next.js 16** and **LangGraph.js**.<br/>
Create amazing fanfiction with an AI assistant that understands your characters, respects canon, and helps bring your stories to life.<br/>
Featuring smart editing, creative wizard, fandom research, and Human-in-the-Loop approval workflows.

[Live Demo][project-link] · [Report Bug][github-issues-link] · [Request Feature][github-issues-link]

<br/>

[![Visit FanFic Lab](https://img.shields.io/badge/🚀_Visit_FanFic_Lab-teal?style=for-the-badge&labelColor=black)][project-link]

<br/>

<!-- SHIELD GROUP -->

[![][github-stars-shield]][github-stars-link]
[![][github-forks-shield]][github-forks-link]
[![][github-issues-shield]][github-issues-link]
[![][github-license-shield]][github-license-link]<br/>
[![][digitalocean-shield]][digitalocean-link]
[![][nextjs-shield]][nextjs-link]
[![][typescript-shield]][typescript-link]
[![][tailwind-shield]][tailwind-link]

**Share FanFic Lab**

[![][share-x-shield]][share-x-link]
[![][share-linkedin-shield]][share-linkedin-link]
[![][share-reddit-shield]][share-reddit-link]
[![][share-whatsapp-shield]][share-whatsapp-link]

<sup>Pioneering the future of AI-assisted creative writing. Built for the fanfiction community.</sup>

<br/>

**Tech Stack**

<img src="https://img.shields.io/badge/next.js-%23000000.svg?style=for-the-badge&logo=nextdotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB"/>
<img src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwindcss&logoColor=white"/>
<img src="https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/redis-%23DC382D.svg?style=for-the-badge&logo=redis&logoColor=white"/>
<img src="https://img.shields.io/badge/openai-%23412991.svg?style=for-the-badge&logo=openai&logoColor=white"/>

</div>

> [!IMPORTANT]
> FanFic Lab combines cutting-edge AI technology with a deep understanding of fanfiction culture. It features LangGraph.js for intelligent agent workflows with Human-in-the-Loop approval, Tavily for fandom research, and a beautiful "Literary Atelier" design system with Teal + Amber color palette.

<details>
<summary><kbd>Table of Contents</kbd></summary>

#### TOC

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#️-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

</details>

## ✨ Overview

FanFic Lab is designed for the fanfiction community, providing:

- **Smart Editor** - AI-powered writing assistance with inline suggestions
- **Creative Wizard** - Conversational story setup with Human-in-the-Loop (HITL) forms
- **Fandom Research** - Tavily-powered research for characters, ships, and world-building
- **Fandom Feed** - Discover and filter stories by fandom, ships, and tags
- **Character Management** - Track characters and detect out-of-character moments
- **Image Gallery** - AI-generated character portraits and scene illustrations (coming soon)

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
        H[Tavily Search]
    end

    subgraph "Backend"
        I[Next.js API Routes]
        J[Prisma ORM]
        K[Neon PostgreSQL]
        L[Redis Cache]
    end

    C --> E
    B --> E
    E --> I
    I --> F
    F --> G
    F --> H
    I --> J
    J --> K
    I --> L
```

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🚀 Key Features

### `1` Smart Editor with AI Assistance

Experience next-generation writing with AI-powered inline suggestions. The Smart Editor integrates CopilotKit for real-time assistance, helping you write better fanfiction faster.

| Feature | Description |
|---------|-------------|
| **CopilotTextarea** | Inline AI suggestions while typing |
| **Magic Continue** | AI writes the next 200-300 words naturally |
| **Expand Text** | Enhance selected text with more dialogue/description/emotion |
| **Polish Prose** | Improve writing quality at light/medium/deep levels |
| **Autosave** | Automatic saving with debounce to localStorage |
| **HITL Approval** | Review and approve/edit AI-generated content |

<div align="right">

[![][back-to-top]](#readme-top)

</div>

### `2` Creative Wizard with Fandom Research

Revolutionary story setup wizard that researches your fandom using Tavily API, understands your characters, and generates story outlines for your approval.

| Feature | Description |
|---------|-------------|
| **Fandom Selector** | Browse popular fandoms or enter custom |
| **Source Research** | Tavily-powered research for characters, ships, world-building |
| **Ship Builder** | Define romantic pairings with AI suggestions |
| **Character Setup** | Add characters with AI-enhanced profiles |
| **Outline Generation** | AI creates story outline for HITL approval |
| **Step Progress** | Visual progress tracking through wizard |

<div align="right">

[![][back-to-top]](#readme-top)

</div>

### `3` Character & OOC System

Intelligent character management with out-of-character detection to keep your characters authentic.

| Feature | Description |
|---------|-------------|
| **Character Sidebar** | Add/manage characters with personality traits |
| **OOC Detection** | AI checks for out-of-character moments |
| **Character Profiles** | Name, fandom, personality, speech patterns |
| **Original Characters** | Support for OCs with custom definitions |
| **Dialogue Suggestions** | In-character dialogue generation |

<div align="right">

[![][back-to-top]](#readme-top)

</div>

### `4` Fandom Feed

Discover and filter stories by fandom, ships, tags, rating, and status.

| Feature | Description |
|---------|-------------|
| **Story Cards** | Display story info with cover images and metadata |
| **Tag Filtering** | Filter by relationship, setting, tone, content |
| **Fandom Tabs** | Quick navigation between fandoms |
| **Rating/Status Filters** | Filter by age rating and completion status |
| **Sorting** | Sort by recent, popular, comments, word count |
| **Infinite Scroll** | Load more stories seamlessly |

<div align="right">

[![][back-to-top]](#readme-top)

</div>

### `*` Additional Features

- [x] 💨 **Quick Setup**: Auto-deploy via `git push` with Coolify on DigitalOcean
- [x] 🌐 **Responsive Design**: Beautiful UI on desktop and mobile
- [x] 🔒 **Authentication**: Stack Auth for secure user management
- [x] 💎 **Literary Atelier Design**: Teal + Amber color palette with elegant typography
- [x] 🗣️ **Real-time AI**: Live AI suggestions and generation
- [x] 📊 **Research Cache**: Redis caching for Tavily search results (30-day TTL)
- [x] 🔌 **Extensible**: Plugin-ready architecture for custom functionality
- [x] ☁️ **Cloud Storage**: Cloudinary integration for image hosting

> ✨ More features are continuously being added as the project evolves.

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🛠️ Tech Stack

<div align="center">
  <table>
    <tr>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/nextdotjs" width="48" height="48" alt="Next.js" />
        <br>Next.js 16
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/react" width="48" height="48" alt="React" />
        <br>React 19
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/typescript" width="48" height="48" alt="TypeScript" />
        <br>TypeScript 5
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/tailwindcss" width="48" height="48" alt="TailwindCSS" />
        <br>TailwindCSS 4
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/postgresql" width="48" height="48" alt="PostgreSQL" />
        <br>PostgreSQL
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/redis" width="48" height="48" alt="Redis" />
        <br>Redis
      </td>
      <td align="center" width="96">
        <img src="https://cdn.simpleicons.org/openai" width="48" height="48" alt="OpenAI" />
        <br>GPT-4o
      </td>
    </tr>
  </table>
</div>

| Layer | Technology | Deployment |
|-------|------------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) | DigitalOcean + Coolify |
| **UI** | React 19, TailwindCSS 4, shadcn/ui | DigitalOcean + Coolify |
| **AI Agent** | LangGraph.js 1.0 | DigitalOcean + Coolify |
| **Reverse Proxy** | Traefik (via Coolify) | DigitalOcean |
| **SSL / CDN** | Cloudflare (proxy mode) | Cloudflare |
| **LLM** | OpenAI GPT-4o / GPT-4o-mini | OpenAI API |
| **Search** | Tavily API | Tavily |
| **Database** | Neon PostgreSQL + Prisma 7 | Neon |
| **Cache** | Redis (ioredis) | Upstash |
| **Auth** | Stack Auth | Stack Auth Cloud |
| **Storage** | Cloudinary | Cloudinary |

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🏗️ Architecture

### System Architecture

> [!TIP]
> FanFic Lab runs on a **DigitalOcean VPS with Coolify** (self-hosted PaaS). Both the Next.js frontend and LangGraph agent are deployed as Docker Compose services, communicating via Docker internal networking. Cloudflare provides SSL and CDN.

```mermaid
graph TB
    subgraph "Cloudflare"
        CF[SSL + CDN + DNS]
    end

    subgraph "DigitalOcean VPS (Coolify)"
        T[Traefik Reverse Proxy]
        subgraph "Docker Compose"
            A[Next.js 16 - Web] --> D[API Routes]
            D --> E[Prisma 7]
            F[LangGraph.js 1.0 - Agent] --> G[chat_node]
            F --> H[research_node]
            F --> I[outline_node]
            F --> J[tool_node]
        end
    end

    subgraph "External Services"
        K[OpenAI API]
        L[Tavily API]
        M[LangSmith]
    end

    subgraph "Data Layer"
        N[Neon PostgreSQL]
        O[Redis Cache]
        P[Cloudinary]
    end

    CF -->|HTTP| T
    T --> A
    D -->|Docker Network| F
    G --> K
    H --> L
    F --> M
    E --> N
    D --> O
    D --> P
```

### Agent Workflow (LangGraph)

The agent uses **dedicated graph nodes** for HITL operations instead of tools. This is a workaround for the CopilotKit/LangGraph.js ToolMessage format incompatibility.

```mermaid
graph TD
    A[START] --> B{routeFromStart}
    B -->|Research Request| C[research_node]
    B -->|Outline Request| D[outline_node]
    B -->|Default| E[chat_node]

    C --> F[Tavily Search x4]
    F --> G[LLM Aggregation]
    G --> H[Emit State with researchData]
    H --> I[Return AIMessage]

    D --> J[Generate Outline]
    J --> K[Set pendingContent]
    K --> L[Emit State for HITL]
    L --> I

    E --> M{Has Tool Call?}
    M -->|Yes| N[tool_node]
    M -->|No| I

    N --> O[Execute Tool]
    O --> I

    I --> P[END]
```

### HITL (Human-in-the-Loop) Pattern

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant CK as CopilotKit
    participant Agent as LangGraph Agent

    Agent->>CK: copilotkitEmitState(pendingContent)
    CK->>FE: State Update
    FE->>FE: useCoAgentStateRender detects pendingContent
    FE->>U: Render Approval Card
    U->>FE: Approve/Edit/Reject
    FE->>CK: respond({ data })
    CK->>Agent: Continue with user input
```

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🚀 Getting Started

### Prerequisites

> [!IMPORTANT]
> Ensure you have the following installed:

- Node.js 20.9.0+ (required by Prisma 7.2.0)
- npm/yarn/pnpm package manager
- Git
- PostgreSQL database (Neon recommended)
- OpenAI API key

### Quick Installation

**1. Clone Repository**

```bash
git clone https://github.com/ChanMeng666/fanfic-lab.git
cd fanfic-lab
```

**2. Install Dependencies**

```bash
npm install
```

**3. Environment Setup**

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

**4. Database Setup**

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

**5. Start Development**

```bash
# Start both Next.js and LangGraph agent
npm run dev:all
```

🎉 **Success!** Open [http://localhost:3000](http://localhost:3000) to view the application.

### Development Commands

```bash
npm run dev        # Start Next.js dev server only
npm run dev:agent  # Start LangGraph agent only
npm run dev:all    # Start both services (recommended)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🔐 Environment Variables

### Local Development (`.env.local`)

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host.neon.tech/fanficlab?sslmode=require

# Stack Auth
STACK_SECRET_SERVER_KEY=ssk_...
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_...

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-...

# LangGraph (local dev: localhost, production: http://agent:8123 via Docker Compose)
LANGGRAPH_URL=http://localhost:8123

# Redis (for research caching)
REDIS_URL=redis://localhost:6379

# Cloudinary (for image hosting)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Optional: Together AI for image generation (currently disabled)
TOGETHER_API_KEY=...

# Optional: LangSmith for tracing
LANGSMITH_API_KEY=lsv2_...

# Optional: Admin endpoint protection
ADMIN_SECRET=...
```

### Production Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | ✅ |
| `STACK_SECRET_SERVER_KEY` | Stack Auth server key | ✅ |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | Stack Auth project ID | ✅ |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | Stack Auth client key | ✅ |
| `LANGGRAPH_URL` | Agent URL (`http://agent:8123` in Docker Compose) | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `CLOUDINARY_*` | Cloudinary credentials | ✅ |
| `LANGSMITH_API_KEY` | LangSmith API key | 🔶 |
| `TAVILY_API_KEY` | Tavily API key (agent service) | ✅ |
| `ADMIN_SECRET` | Admin endpoint protection | 🔶 |

> ✅ Required, 🔶 Optional

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 📊 Database Schema

```mermaid
erDiagram
    User ||--o{ Story : writes
    User ||--o{ Character : creates
    User ||--o{ Draft : has
    User ||--|| UserPreferences : configures
    User ||--o{ Follow : follows
    Story ||--o{ Chapter : contains
    Story ||--o{ StoryCharacter : features
    Story ||--o{ Like : receives
    Story ||--o{ Comment : has
    Character ||--o{ StoryCharacter : appears_in
    Story ||--o{ Image : includes

    User {
        string id PK
        string stackAuthId UK
        string email UK
        string username UK
        string displayName
        string avatarUrl
        string bio
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
        string coverImageUrl
    }

    Character {
        string id PK
        string name
        string fandom
        string[] personalityTraits
        string speechPatterns
        boolean isOriginal
        string portraitUrl
    }

    SourceResearchCache {
        string id PK
        string sourceName
        string sourceType
        string normalizedName UK
        json researchData
        int searchCount
        datetime lastAccessedAt
    }
```

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 📁 Project Structure

```
fanfic-lab/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API routes
│   │   │   ├── copilotkit/          # CopilotKit runtime
│   │   │   ├── research-cache/      # Redis caching
│   │   │   ├── health/              # Health check
│   │   │   ├── admin/cache-stats/   # Cache analytics
│   │   │   └── upload/cover/        # Cover upload
│   │   ├── (main)/                   # Main routes
│   │   │   ├── (protected)/         # Auth required
│   │   │   │   ├── editor/          # Smart Editor
│   │   │   │   ├── wizard/          # Creative Wizard
│   │   │   │   └── profile/         # User Profile
│   │   │   └── feed/                # Fandom Feed (public)
│   │   └── handler/[...stack]/      # Stack Auth
│   │
│   ├── components/                   # React components
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── editor/                  # Editor components
│   │   ├── wizard/                  # Wizard components
│   │   ├── feed/                    # Feed components
│   │   ├── hitl/                    # HITL approval cards
│   │   ├── layout/                  # Layout components
│   │   └── providers/               # Context providers
│   │
│   ├── agent/                        # LangGraph agent
│   │   ├── agent.ts                 # Workflow definition
│   │   ├── state.ts                 # State annotation
│   │   └── tools/                   # Agent tools
│   │
│   └── lib/                          # Utilities
│       ├── hooks/                   # Custom hooks
│       ├── actions/                 # Server actions
│       ├── types/                   # TypeScript types
│       ├── db.ts                    # Database client
│       ├── redis.ts                 # Redis client
│       └── cloudinary.ts            # Cloudinary client
│
├── prisma/
│   ├── schema.prisma                # Database schema
│   └── migrations/                  # Migrations
│
├── docs/
│   ├── COPILOTKIT_LANGGRAPH_HITL_GUIDE.md
│   └── MIGRATION_RAILWAY_TO_DIGITALOCEAN.md
│
└── public/                          # Static assets
```

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 📡 API Reference

### POST /api/copilotkit

CopilotKit runtime endpoint that routes requests to the LangGraph agent.

```typescript
const runtime = new CopilotRuntime({
  agents: {
    fanfic_agent: new LangGraphAgent({
      deploymentUrl: process.env.LANGGRAPH_URL,
      graphId: "fanfic_agent",
    }),
  },
});
```

### GET/POST /api/research-cache

Research results caching endpoint (Redis).

| Method | Query/Body | Description |
|--------|------------|-------------|
| GET | `?sourceName=X&sourceType=Y` | Check if cached research exists |
| POST | `{ sourceName, sourceType, researchData }` | Save research results (30-day TTL) |
| DELETE | `?sourceName=X` | Clear cache (requires ADMIN_SECRET) |

### GET /api/health

Service health check endpoint.

```json
{
  "status": "healthy",
  "services": {
    "redis": { "status": "up", "latency": 5 },
    "database": { "status": "up", "latency": 12 }
  }
}
```

### POST /api/upload/cover

Cover image upload endpoint.

- Validates user authentication and story ownership
- Accepts: jpeg, png, webp (max 5MB)
- Uploads to Cloudinary
- Returns: URL, publicId, dimensions

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🛳 Deployment

### Cloud Deployment (DigitalOcean + Coolify)

FanFic Lab runs on a DigitalOcean VPS with Coolify (self-hosted PaaS), using Docker Compose for both services. Cloudflare handles SSL and CDN.

**Services:**

| Service | Dockerfile | Port | Health Check |
|---------|-----------|------|-------------|
| **Web** (Next.js) | `Dockerfile.web` | 3000 | `/api/health` |
| **Agent** (LangGraph) | `Dockerfile.agent` | 8123 | `/info` |

**Deployment Compose:** `docker-compose.coolify.yml`

### Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://fanfic-lab.tech |
| www (redirect) | https://www.fanfic-lab.tech → https://fanfic-lab.tech |
| Agent (Internal) | http://agent:8123 (Docker Compose network) |
| Coolify Dashboard | http://159.223.173.17:8000 |

### Deployment Methods

| Method | Command |
|--------|---------|
| **Auto-deploy** | `git push origin master` (GitHub webhook → Coolify) |
| **Manual (API)** | `curl -X POST http://159.223.173.17:8000/api/v1/applications/wea94e791gdrn59xv4tqnxdm/restart -H "Authorization: Bearer <token>"` |
| **Dashboard** | Open Coolify → Deploy button |

### Architecture Diagram

```
                    ┌──────────────┐
                    │  Cloudflare  │
                    │  SSL + CDN   │
                    └──────┬───────┘
                           │ HTTP
┌──────────────────────────┼────────────────────────┐
│          DigitalOcean VPS (Coolify)                │
│                  ┌───────┴───────┐                 │
│                  │    Traefik    │                 │
│                  │ Reverse Proxy │                 │
│                  └───────┬───────┘                 │
│  ┌───────────────────────┼───────────────────────┐│
│  │            Docker Compose Network             ││
│  │  ┌─────────────────────┐ ┌──────────────────┐ ││
│  │  │    Web Service      │ │  Agent Service   │ ││
│  │  │    (Next.js 16)     │ │  (LangGraph.js)  │ ││
│  │  │                     │ │                  │ ││
│  │  │  • React 19         │ │  • chat_node     │ ││
│  │  │  • Prisma 7         │ │  • research_node │ ││
│  │  │  • Stack Auth       │ │  • outline_node  │ ││
│  │  │  • Port 3000        │ │  • Port 8123     │ ││
│  │  └──────────┬──────────┘ └────────┬─────────┘ ││
│  │             │  http://agent:8123  │           ││
│  │             └─────────────────────┘           ││
│  └───────────────────────────────────────────────┘│
└──────────────────────────┼────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐      ┌──────────┐      ┌──────────┐
   │   Neon   │      │  Upstash │      │Cloudinary│
   │PostgreSQL│      │  Redis   │      │  Images  │
   └──────────┘      └──────────┘      └──────────┘
```

> For detailed migration history and Coolify setup guide, see [docs/MIGRATION_RAILWAY_TO_DIGITALOCEAN.md](./docs/MIGRATION_RAILWAY_TO_DIGITALOCEAN.md).

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 🤝 Contributing

We welcome contributions! Here's how you can help improve FanFic Lab:

**1. Fork & Clone**

```bash
git clone https://github.com/ChanMeng666/fanfic-lab.git
cd fanfic-lab
```

**2. Create Branch**

```bash
git checkout -b feature/your-feature-name
```

**3. Make Changes**

- Follow our coding standards in [CLAUDE.md](./CLAUDE.md)
- Add tests for new features
- Update documentation as needed

**4. Submit PR**

- Provide clear description
- Reference related issues
- Ensure CI passes

[![][pr-welcome-shield]][github-issues-link]

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 👥 Team

<div align="center">
  <table>
    <tr>
      <td align="center">
        <a href="https://github.com/ChanMeng666">
          <img src="https://github.com/ChanMeng666.png?size=100" width="100px;" alt="Chan Meng"/>
          <br />
          <sub><b>Chan Meng</b></sub>
        </a>
        <br />
        <small>Creator & Lead Developer</small>
      </td>
    </tr>
  </table>
</div>

## 🙋‍♀️ Author

**Chan Meng**
- <img src="https://cdn.simpleicons.org/linkedin/0A66C2" width="16" height="16"> LinkedIn: [chanmeng666](https://www.linkedin.com/in/chanmeng666/)
- <img src="https://cdn.simpleicons.org/github/181717" width="16" height="16"> GitHub: [ChanMeng666](https://github.com/ChanMeng666)
- <img src="https://cdn.simpleicons.org/gmail/EA4335" width="16" height="16"> Email: [chanmeng.dev@gmail.com](mailto:chanmeng.dev@gmail.com)
- <img src="https://cdn.simpleicons.org/internetexplorer/0078D4" width="16" height="16"> Website: [chanmeng.live](https://2d-portfolio-eta.vercel.app/)

<div align="right">

[![][back-to-top]](#readme-top)

</div>

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**Open Source Benefits:**
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed

---

<div align="center">

**Built with ❤️ for the fanfiction community**

AI-powered, community-driven.

<br/>

[![][github-stars-shield]][github-stars-link]
[![][github-forks-shield]][github-forks-link]

**⭐ Star us on GitHub** — it helps!

</div>

<!-- LINK DEFINITIONS -->

[back-to-top]: https://img.shields.io/badge/-BACK_TO_TOP-151515?style=flat-square

<!-- Project Links -->
[project-link]: https://www.fanfic-lab.tech

<!-- GitHub Links -->
[github-issues-link]: https://github.com/ChanMeng666/fanfic-lab/issues
[github-stars-link]: https://github.com/ChanMeng666/fanfic-lab/stargazers
[github-forks-link]: https://github.com/ChanMeng666/fanfic-lab/forks
[github-license-link]: https://github.com/ChanMeng666/fanfic-lab/blob/main/LICENSE

<!-- External Links -->
[digitalocean-link]: https://fanfic-lab.tech
[nextjs-link]: https://nextjs.org
[typescript-link]: https://www.typescriptlang.org
[tailwind-link]: https://tailwindcss.com

<!-- Shield Badges -->
[github-stars-shield]: https://img.shields.io/github/stars/ChanMeng666/fanfic-lab?color=ffcb47&labelColor=black&style=flat-square
[github-forks-shield]: https://img.shields.io/github/forks/ChanMeng666/fanfic-lab?color=8ae8ff&labelColor=black&style=flat-square
[github-issues-shield]: https://img.shields.io/github/issues/ChanMeng666/fanfic-lab?color=ff80eb&labelColor=black&style=flat-square
[github-license-shield]: https://img.shields.io/github/license/ChanMeng666/fanfic-lab?color=white&labelColor=black&style=flat-square
[digitalocean-shield]: https://img.shields.io/badge/digitalocean-online-0080FF?labelColor=black&logo=digitalocean&style=flat-square
[nextjs-shield]: https://img.shields.io/badge/Next.js-16-black?labelColor=black&logo=nextdotjs&style=flat-square
[typescript-shield]: https://img.shields.io/badge/TypeScript-5-3178C6?labelColor=black&logo=typescript&style=flat-square
[tailwind-shield]: https://img.shields.io/badge/TailwindCSS-4-38B2AC?labelColor=black&logo=tailwindcss&style=flat-square
[pr-welcome-shield]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square

<!-- Social Share Links -->
[share-x-link]: https://x.com/intent/tweet?hashtags=fanfiction,ai,opensource&text=Check%20out%20FanFic%20Lab%20-%20AI-powered%20fanfiction%20writing%20platform!&url=https%3A%2F%2Fgithub.com%2FChanMeng666%2Ffanfic-lab
[share-linkedin-link]: https://linkedin.com/sharing/share-offsite/?url=https://github.com/ChanMeng666/fanfic-lab
[share-reddit-link]: https://www.reddit.com/submit?title=FanFic%20Lab%20-%20AI-powered%20fanfiction%20writing%20platform&url=https%3A%2F%2Fgithub.com%2FChanMeng666%2Ffanfic-lab
[share-whatsapp-link]: https://api.whatsapp.com/send?text=Check%20out%20FanFic%20Lab%20https%3A%2F%2Fgithub.com%2FChanMeng666%2Ffanfic-lab

[share-x-shield]: https://img.shields.io/badge/-share%20on%20x-black?labelColor=black&logo=x&logoColor=white&style=flat-square
[share-linkedin-shield]: https://img.shields.io/badge/-share%20on%20linkedin-black?labelColor=black&logo=linkedin&logoColor=white&style=flat-square
[share-reddit-shield]: https://img.shields.io/badge/-share%20on%20reddit-black?labelColor=black&logo=reddit&logoColor=white&style=flat-square
[share-whatsapp-shield]: https://img.shields.io/badge/-share%20on%20whatsapp-black?labelColor=black&logo=whatsapp&logoColor=white&style=flat-square
