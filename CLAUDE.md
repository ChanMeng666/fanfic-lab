# FanFic Lab - Claude Code Guidelines

Essential design system rules and coding patterns for Claude Code. For detailed technical documentation, see [README.md](./README.md).

---

## Quick Reference

| Layer | Technology | Deployment |
|-------|------------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS 4 | Railway |
| AI Runtime | CopilotKit 1.x | Railway |
| AI Agent | LangGraph.js 1.0 | Railway |
| Database | Prisma 7 + Neon PostgreSQL | Neon |
| Cache | Redis (ioredis) | Upstash |
| Storage | Cloudinary | Cloudinary |

**Production URLs:**
- Frontend: `https://fanfic-lab-web.up.railway.app` (Railway default domain)
- Agent: `http://agent.railway.internal:8123` (Railway private network)

---

## Brand Identity: "Literary Atelier"

- **Logo**: Use `Feather` icon from Lucide (never emoji logos)
- **Display font**: Cormorant Garamond for "FanFic Lab" text
- **Theme**: Teal (primary) + Amber (AI accent) + warm cream backgrounds

---

## Color Tokens

| Token | Usage |
|-------|-------|
| `--primary` | Teal - main actions, links |
| `--accent` | Amber - AI interactions |
| `--background` | Warm cream/charcoal |
| `--surface` | Cards, panels |
| `--ai-surface` | AI-generated content background |

### Tailwind Usage

```tsx
// Backgrounds
className="bg-background"      // Page
className="bg-surface"         // Cards
className="bg-ai-surface"      // AI content

// Text
className="text-foreground"         // Primary
className="text-muted-foreground"   // Secondary
className="text-primary"            // Links
className="text-accent"             // AI-related

// AI styling
className="ai-glow"                 // Amber glow effect
className="border-accent/30 bg-ai-surface ai-glow"  // AI card
```

---

## Typography

| Font | Class | Usage |
|------|-------|-------|
| Cormorant Garamond | `font-display` | Headings, titles |
| Source Sans 3 | `font-sans` | UI text (default) |
| Lora | `font-prose` | Story content |
| JetBrains Mono | `font-mono` | Code |

---

## Icons (Lucide Only)

**Never use emojis in UI.**

| Concept | Icon |
|---------|------|
| Brand | `Feather` |
| AI/Magic | `Sparkles` |
| Writing | `PenLine` |
| Characters | `Users` |
| Stories | `BookOpen` |
| OOC Detection | `Theater` |

### Icon Sizing

```tsx
<Icon className="size-4" />     // Standard
<Icon className="size-5" />     // Header
<Icon className="size-8" />     // Empty state
<Icon className="size-3.5" />   // Button
```

### Icon Container

```tsx
// Primary
<div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
  <Feather className="size-4" />
</div>

// AI/Accent
<div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
  <Sparkles className="size-4" />
</div>
```

---

## Key Component Patterns

### Card Header

```tsx
<CardHeader className="pb-3">
  <CardTitle className="flex items-center justify-between text-base">
    <span className="flex items-center gap-2.5">
      <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
        <BookOpen className="size-4" />
      </div>
      <span className="font-display">Title</span>
    </span>
    <Badge variant="secondary">Count</Badge>
  </CardTitle>
</CardHeader>
```

### AI Content Card (HITL)

```tsx
<Card className="border-accent/30 bg-ai-surface ai-glow">
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center justify-between text-lg">
      <span className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
          <Sparkles className="size-4" />
        </div>
        <span className="font-display">AI Generated</span>
      </span>
      <Badge variant="secondary" className="text-xs gap-1">
        <Sparkles className="size-3" />
        AI Generated
      </Badge>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
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

### Button with Icon

```tsx
<Button className="gap-1.5">
  <Sparkles className="size-4" />
  Magic Continue
</Button>
```

### Loading Spinner

```tsx
<div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
```

---

## Animations

| Class | Effect |
|-------|--------|
| `animate-fade-slide-in` | Page enter |
| `animate-ai-reveal` | AI content reveal |
| `ai-glow` | Amber glow |
| `hover-lift` | Hover lift |

---

## Do's and Don'ts

### Do
- Use semantic color tokens (`text-foreground`, `bg-surface`)
- Use Lucide icons only
- Use `font-display` for headings
- Use `font-prose` for story content
- Use amber/accent for AI elements
- Use teal/primary for main actions
- Apply `ai-glow` to AI cards

### Don't
- Use hardcoded colors (`text-gray-500`, `bg-purple-600`)
- Use emojis in UI
- Use purple/pink gradients
- Use pure black/white (`#000`, `#fff`)
- Mix icon libraries
