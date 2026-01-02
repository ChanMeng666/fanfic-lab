# FanFic Lab - Claude Code Development Guidelines

This document provides comprehensive guidelines for Claude Code to follow when developing FanFic Lab. It covers project architecture, deployment setup, design system, coding patterns, and best practices.

---

## Project Overview

FanFic Lab is an AI-powered fanfiction writing platform built with a split deployment architecture.

| Layer | Technology | Deployment |
|-------|------------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 | Vercel |
| UI Components | shadcn/ui | Vercel |
| AI Runtime | CopilotKit 1.8 | Vercel |
| AI Agent | LangGraph.js 0.3 | Railway |
| Database | Prisma 7 + Neon PostgreSQL | Neon |
| Auth | Stack Auth | Stack Auth Cloud |

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Production URLs                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend:  https://fanfic-lab.vercel.app                       │
│  Agent:     https://fanfic-lab-production.up.railway.app        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│      Vercel         │         │      Railway        │
│  (Next.js + API)    │         │   (LangGraph Agent) │
├─────────────────────┤         ├─────────────────────┤
│  • Next.js 16       │         │  • LangGraph.js     │
│  • React 19         │  HTTP   │  • OpenAI GPT-4o    │
│  • CopilotKit       │◄───────►│  • Agent Tools      │
│  • Prisma 7         │         │                     │
│  • Stack Auth       │         │  Port: 8123         │
└─────────────────────┘         └─────────────────────┘
         │                               │
         │                               │
         ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│  Neon PostgreSQL    │         │   OpenAI API        │
└─────────────────────┘         └─────────────────────┘
```

### Why Split Deployment?

- **Vercel** cannot run long-running processes like `langgraphjs dev`
- **Railway** provides persistent server for LangGraph agent
- CopilotKit on Vercel connects to Railway via `LANGGRAPH_URL` environment variable

---

## Development Setup

### Prerequisites

- Node.js 20.9.0+ (required by Prisma 7.2.0)
- npm 9.x
- OpenAI API key
- Neon PostgreSQL database

### Quick Start

```bash
# Install dependencies
npm install

# Start both services (recommended)
npm run dev:all

# Or start separately:
npm run dev         # Next.js on http://localhost:3000
npm run dev:agent   # LangGraph on http://localhost:8123
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run dev:agent` | Start LangGraph agent server |
| `npm run dev:all` | Start both services concurrently |
| `npm run build` | Build Next.js for production |
| `npm run start` | Start Next.js production server |
| `npm run start:agent` | Start LangGraph agent (Railway uses this) |
| `npm run start:all` | Start both services in production |
| `npm run lint` | Run ESLint |

---

## Environment Variables

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

# LangGraph (local development)
LANGGRAPH_URL=http://localhost:8123

# Optional: Together AI for image generation
TOGETHER_API_KEY=...

# Optional: LangSmith for tracing
LANGSMITH_API_KEY=lsv2_...
```

### Vercel Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | Neon PostgreSQL connection |
| `STACK_SECRET_SERVER_KEY` | `ssk_...` | Stack Auth server key |
| `NEXT_PUBLIC_STACK_PROJECT_ID` | `...` | Stack Auth project ID |
| `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY` | `pck_...` | Stack Auth client key |
| `LANGGRAPH_URL` | `https://fanfic-lab-production.up.railway.app` | Railway agent URL |

### Railway Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `OPENAI_API_KEY` | `sk-...` | OpenAI API key for AI features |
| `PORT` | Auto-assigned | Railway sets this automatically |

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `src/agent/langgraph.json` | LangGraph agent configuration |
| `railway.json` | Railway deployment configuration |
| `nixpacks.toml` | Railway build configuration (skips Prisma) |
| `.nvmrc` | Node.js version specification (20) |
| `prisma/schema.prisma` | Database schema |

---

## API Route: CopilotKit

The CopilotKit runtime connects to the LangGraph agent:

```typescript
// src/app/api/copilotkit/route.ts
const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://localhost:8123";

const runtime = new CopilotRuntime({
  agents: {
    fanfic_agent: new LangGraphAgent({
      deploymentUrl: LANGGRAPH_URL,
      graphId: "fanfic_agent",
    }),
  },
});
```

---

## Brand Identity: "Literary Atelier"

FanFic Lab uses a **"Literary Atelier"** design concept - a refined creative space where writers craft stories with an intelligent AI collaborator. The aesthetic is sophisticated, warm, and focused on the writing experience.

### Brand Values
- **Collaborative**: AI as creative partner, not just a tool
- **Refined**: Sophisticated without being pretentious
- **Warm**: Inviting and approachable
- **Focused**: Distraction-free writing environment
- **Magical**: Subtle sense of creative possibility

### Logo
- Use the `Feather` icon from Lucide as the brand icon
- Display font: Cormorant Garamond for "FanFic Lab" text
- Never use emoji logos (✨ or similar)

---

## Color System: Teal + Amber

The color palette uses OKLCH color space for perceptually uniform colors.

### Primary Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--primary` | `oklch(0.45 0.12 175)` | `oklch(0.60 0.12 175)` | Deep Teal - main actions, links |
| `--primary-hover` | `oklch(0.40 0.13 175)` | `oklch(0.65 0.13 175)` | Hover state |
| `--primary-foreground` | `oklch(0.99 0 0)` | `oklch(0.15 0.015 50)` | Text on primary |

### Accent Colors (AI)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--accent` | `oklch(0.75 0.15 75)` | `oklch(0.75 0.15 75)` | Warm Amber - AI interactions |
| `--accent-subtle` | `oklch(0.92 0.05 75)` | `oklch(0.30 0.08 75)` | AI backgrounds |
| `--accent-foreground` | `oklch(0.30 0.08 60)` | `oklch(0.95 0.01 85)` | Text on accent |

### Background Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `oklch(0.985 0.005 85)` | `oklch(0.18 0.015 50)` | Warm cream/charcoal |
| `--surface` | `oklch(1 0 0)` | `oklch(0.22 0.015 50)` | Cards, panels |
| `--surface-raised` | `oklch(0.995 0.003 85)` | `oklch(0.25 0.015 50)` | Elevated surfaces |

### Text Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--foreground` | `oklch(0.25 0.02 50)` | `oklch(0.95 0.01 85)` | Primary text |
| `--muted-foreground` | `oklch(0.50 0.015 50)` | `oklch(0.65 0.01 85)` | Secondary text |

### Semantic Colors

| Token | Usage |
|-------|-------|
| `--success` | Forest green - positive actions, OOC check pass |
| `--warning` | Amber (same as accent) - caution states |
| `--destructive` | Warm red - errors, delete actions |
| `--info` | Soft blue - informational |

### AI-Specific Colors

| Token | Usage |
|-------|-------|
| `--ai-surface` | Background for AI-generated content |
| `--ai-glow` | Glow effect for AI elements |

### Usage in Tailwind

```tsx
// Background colors
className="bg-background"      // Page background
className="bg-surface"         // Cards, panels
className="bg-ai-surface"      // AI content areas

// Text colors
className="text-foreground"         // Primary text
className="text-muted-foreground"   // Secondary text
className="text-primary"            // Links, emphasis
className="text-accent"             // AI-related text

// Border colors
className="border-border"         // Default borders
className="border-primary/30"     // Teal accent borders
className="border-accent/30"      // Amber accent borders

// AI styling
className="ai-glow"              // Amber glow effect
className="bg-ai-surface ai-glow" // AI card styling
```

---

## Typography

### Font Families

| Font | Variable | Usage |
|------|----------|-------|
| Cormorant Garamond | `font-display` | Display headings, titles |
| Source Sans 3 | `font-sans` (default) | UI text, body |
| Lora | `font-prose` | Story content, long-form reading |
| JetBrains Mono | `font-mono` | Code, technical text |

### Typography Classes

```tsx
// Display headings (Cormorant Garamond)
className="font-display text-2xl"

// Default body text (Source Sans 3)
className="text-base"

// Prose/story content (Lora)
className="font-prose text-lg leading-relaxed"

// Monospace
className="font-mono text-sm"
```

---

## Icons: Lucide React

**Always use Lucide icons. Never use emojis in UI.**

### Common Icon Mappings

| Concept | Icon | Import |
|---------|------|--------|
| Brand logo | `Feather` | `import { Feather } from "lucide-react"` |
| AI/Magic | `Sparkles` | `import { Sparkles } from "lucide-react"` |
| Writing | `PenLine` | `import { PenLine } from "lucide-react"` |
| Characters | `Users` | `import { Users } from "lucide-react"` |
| Settings | `Settings` | `import { Settings } from "lucide-react"` |
| Profile | `User` | `import { User } from "lucide-react"` |
| Stories | `BookOpen` | `import { BookOpen } from "lucide-react"` |
| Heart/Like | `Heart` | `import { Heart } from "lucide-react"` |
| Comments | `MessageSquare` | `import { MessageSquare } from "lucide-react"` |
| Search | `Search` | `import { Search } from "lucide-react"` |
| Images | `ImageIcon` | `import { ImageIcon } from "lucide-react"` |
| Save | `Save` | `import { Save } from "lucide-react"` |
| Send/Publish | `Send` | `import { Send } from "lucide-react"` |
| Add | `Plus` | `import { Plus } from "lucide-react"` |
| Remove | `X` | `import { X } from "lucide-react"` |
| Check | `Check` | `import { Check } from "lucide-react"` |
| Edit | `Pencil` | `import { Pencil } from "lucide-react"` |
| Refresh | `RefreshCw` | `import { RefreshCw } from "lucide-react"` |
| Delete | `Trash2` | `import { Trash2 } from "lucide-react"` |
| Expand | `ChevronDown` / `ChevronUp` | Collapse/expand |
| OOC Detection | `Theater` | `import { Theater } from "lucide-react"` |
| Dialogue | `MessageSquare` | Dialogue issues |
| Actions | `Footprints` | Action issues |
| Emotions | `Brain` | Emotion issues |
| Warning | `AlertTriangle` | Warnings |
| Library | `Library` | Fandom selection |
| Ships | `Heart` | Romantic pairings |
| Outline | `ClipboardList` | Story outlines |

### Icon Sizing

```tsx
// Standard icon in text
<Icon className="size-4" />

// Icon in header/title
<Icon className="size-5" />

// Large icon (empty state)
<Icon className="size-8" />

// Icon button
<Icon className="size-3.5" />
```

### Icon Container Pattern

```tsx
// Standard icon container in card headers
<div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
  <Feather className="size-4" />
</div>

// AI-themed icon container
<div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
  <Sparkles className="size-4" />
</div>

// Secondary icon container
<div className="flex items-center justify-center size-8 rounded-lg bg-secondary text-secondary-foreground">
  <Users className="size-4" />
</div>
```

---

## Component Patterns

### Card Header with Icon

```tsx
<CardHeader className="pb-3">
  <CardTitle className="flex items-center justify-between text-base">
    <span className="flex items-center gap-2.5">
      <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
        <BookOpen className="size-4" />
      </div>
      <span className="font-display">Title Here</span>
    </span>
    <Badge variant="secondary">Count</Badge>
  </CardTitle>
</CardHeader>
```

### AI-Styled Card

```tsx
<Card className="border-accent/30 bg-ai-surface ai-glow">
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2.5">
      <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
        <Sparkles className="size-4" />
      </div>
      <span className="font-display">AI Generated Content</span>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Button with Icon

```tsx
<Button className="gap-1.5">
  <Sparkles className="size-4" />
  Magic Continue
</Button>

<Button variant="outline" className="gap-1.5">
  <Pencil className="size-3.5" />
  Edit
</Button>
```

### Empty State

```tsx
<div className="text-center py-8">
  <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
    <Users className="size-8 text-muted-foreground" />
  </div>
  <p className="text-sm font-medium text-foreground mb-1">No items yet</p>
  <p className="text-xs text-muted-foreground">
    Description of what to do next
  </p>
</div>
```

### Loading Spinner

```tsx
// Primary color spinner
<div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />

// Accent/AI color spinner
<div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
```

---

## AI-Specific Patterns

### AI Content Card (HITL Approval)

```tsx
<Card className="border-accent/30 bg-ai-surface ai-glow">
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center justify-between text-lg">
      <span className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
          <Icon className="size-4" />
        </div>
        <span className="font-display">Title</span>
      </span>
      <Badge variant="secondary" className="text-xs gap-1">
        <Sparkles className="size-3" />
        AI Generated
      </Badge>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* AI-generated content */}

    <div className="flex items-center gap-2 pt-3 border-t border-border">
      <Button size="sm" className="gap-1.5">
        <Check className="size-3.5" />
        Accept
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5">
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <Button size="sm" variant="ghost" className="gap-1.5">
        <RefreshCw className="size-3.5" />
        Regenerate
      </Button>
    </div>
  </CardContent>
</Card>
```

### AI Loading State

```tsx
<div className="flex items-center gap-2 p-3 bg-ai-surface border border-accent/30 rounded-xl ai-glow">
  <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
  <span className="text-sm text-accent-foreground">Generating content...</span>
</div>
```

### AI Toolbar Button

```tsx
<Button
  variant="ghost"
  size="sm"
  className="gap-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10"
  disabled={isLoading}
>
  <Sparkles className="size-4" />
  Magic Continue
</Button>
```

---

## Animations

### Available Animation Classes

| Class | Effect |
|-------|--------|
| `animate-fade-slide-in` | Page enter animation |
| `animate-ai-reveal` | AI content reveal with glow |
| `animate-shimmer` | Shimmer loading effect |
| `animate-ai-pulse` | AI element pulsing glow |
| `animate-approval-pulse` | HITL approval card pulse |
| `hover-lift` | Hover lift with shadow |

### AI Thinking State

```tsx
<div className="ai-thinking">
  {/* Content with shimmer overlay */}
</div>
```

---

## Form Patterns

### Input with Icon

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
  <Input
    placeholder="Search..."
    className="pl-9 bg-surface"
  />
</div>
```

### Label Pattern

```tsx
<div>
  <label className="text-sm font-medium text-foreground mb-2 block">
    Field Label
  </label>
  <Input placeholder="..." />
</div>
```

---

## Page Layout Patterns

### Page Header with Logo

```tsx
<header className="border-b border-border bg-surface/80 backdrop-blur-sm">
  <div className="container mx-auto flex h-16 items-center justify-between px-4">
    <Link href="/" className="flex items-center gap-2">
      <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10">
        <Feather className="size-5 text-primary" />
      </div>
      <span className="text-xl font-display font-bold text-foreground">
        FanFic Lab
      </span>
    </Link>
    {/* Right side actions */}
  </div>
</header>
```

### Card-Based Page Content

```tsx
<main className="container mx-auto px-4 py-12 max-w-2xl">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2.5 text-2xl font-display">
        <div className="flex items-center justify-center size-10 rounded-xl bg-accent/15 text-accent">
          <Sparkles className="size-5" />
        </div>
        Page Title
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Content */}
    </CardContent>
  </Card>
</main>
```

---

## Do's and Don'ts

### Do
- Use semantic color tokens (`text-foreground`, `bg-surface`, etc.)
- Use Lucide icons for all iconography
- Use `font-display` (Cormorant Garamond) for headings and titles
- Use `font-prose` (Lora) for story/reading content
- Use amber/accent colors for AI-related elements
- Use teal/primary colors for main actions
- Apply `ai-glow` class to AI content cards
- Use consistent icon container patterns

### Don't
- Use hardcoded colors (`text-gray-500`, `bg-purple-600`)
- Use emojis in UI (✨, 📚, 💕, etc.)
- Use purple/pink gradients (old design)
- Use pure black (`#000`) or pure white (`#fff`)
- Mix different icon libraries
- Apply random color choices without semantic meaning

---

## CopilotKit Theming

CopilotKit components automatically inherit the theme via CSS variables:

```css
.copilotKitRoot,
[data-copilotkit] {
  --copilot-kit-primary-color: oklch(0.45 0.12 175);  /* Teal */
  --copilot-kit-background-color: var(--surface);
  --copilot-kit-secondary-color: var(--ai-surface);  /* Amber tint */
}
```

Assistant messages have an amber left border to indicate AI origin:
```css
.copilotKitAssistantMessage {
  background: var(--ai-surface) !important;
  border-left: 3px solid var(--accent) !important;
}
```

---

## File Structure Reference

```
src/
├── app/
│   ├── globals.css           # Design system tokens & styles
│   └── layout.tsx            # Font imports (Cormorant, Source Sans, Lora)
├── components/
│   ├── ui/                   # shadcn/ui base components
│   ├── editor/               # Editor components (SmartEditor, AIToolbar, etc.)
│   ├── wizard/               # Wizard components (FandomSelector, etc.)
│   ├── feed/                 # Feed components (StoryCard, TagFilter, etc.)
│   └── hitl/                 # HITL components (ContentApprovalCard, etc.)
└── lib/
    └── utils.ts              # cn() helper for Tailwind classes
```

---

## Summary

When developing for FanFic Lab:

1. **Colors**: Teal primary, Amber accent (for AI), warm cream/charcoal backgrounds
2. **Typography**: Cormorant for display, Source Sans for UI, Lora for prose
3. **Icons**: Lucide only, no emojis
4. **AI Elements**: Use `ai-surface`, `ai-glow`, and amber accent colors
5. **Components**: Follow the established patterns for cards, buttons, and forms
6. **Animations**: Use predefined animation classes for consistency

This design system creates a cohesive, literary, and professional experience that positions AI as a collaborative writing partner.
