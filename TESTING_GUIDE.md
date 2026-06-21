# FanFic Lab - Manual Testing Guide

Step-by-step manual checks for the current FanFic Lab platform (an autonomous **DreamWriter**
story generator with a social reading layer). There is no automated test suite yet; these are
manual E2E scenarios.

> Architecture note: the DreamWriter agent runs **in-process** inside the Next.js app. There is
> no separate agent server to start, and no `LANGGRAPH_URL`. A single `npm run dev` runs everything.

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Environment Variables](#2-environment-variables)
3. [Homepage Tests](#3-homepage-tests)
4. [Authentication Tests](#4-authentication-tests)
5. [Story Creation (DreamWriter) Tests](#5-story-creation-dreamwriter-tests)
6. [Story Reader & Continue Tests](#6-story-reader--continue-tests)
7. [Discovery Feed Tests](#7-discovery-feed-tests)
8. [Social & Profile Tests](#8-social--profile-tests)
9. [Database & Persistence Tests](#9-database--persistence-tests)
10. [Observability & Error Handling](#10-observability--error-handling)
11. [Known Issues & Limitations](#11-known-issues--limitations)

---

## 1. Prerequisites & Setup

### Required Software
- Node.js 20.9.0+ (required by Prisma 7.2.0)
- npm 9.x
- Git

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/ChanMeng666/fanfic-lab.git
cd fanfic-lab

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Apply the schema (requires DATABASE_URL)
npx prisma migrate dev   # or: npx prisma db push

# 5. Start the app (the DreamWriter agent runs in-process)
npm run dev
```

### Available Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the app at http://localhost:3000 (agent runs in-process) |
| `npm run dev:studio` | Optional: LangGraph Studio for visual agent debugging (port 8123, local-only) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

### Verify Installation
- [ ] Open `http://localhost:3000` — the homepage loads with FanFic Lab branding
- [ ] No errors in the browser console
- [ ] `GET http://localhost:3000/api/health` returns `database: up`

---

## 2. Environment Variables

Create `.env.local`:

```env
# Database (Neon PostgreSQL) — pooled for the app, unpooled for the agent checkpointer
DATABASE_URL=postgresql://user:password@host-pooler.neon.tech/fanficlab?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@host.neon.tech/fanficlab?sslmode=require

# Stack Auth (authentication; also the engine behind Neon Auth)
STACK_SECRET_SERVER_KEY=your_stack_secret_key
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key

# OpenAI (required for story generation)
OPENAI_API_KEY=sk-...

# Cloudinary (cover/avatar image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: LangSmith for agent tracing
LANGSMITH_API_KEY=lsv2_...

# Optional: admin endpoint protection
ADMIN_SECRET=your_admin_secret
```

### Environment Variable Tests
- [ ] App starts without critical errors
- [ ] Database connection works (Prisma `SELECT 1` succeeds via `/api/health`)
- [ ] Stack Auth pages load at `/handler/*`
- [ ] First story generation succeeds (confirms `OPENAI_API_KEY`)
- [ ] On first generation, the LangGraph checkpoint tables are created in Postgres
      (`checkpoints`, `checkpoint_writes`, `checkpoint_blobs`, `checkpoint_migrations`)
- [ ] Cover upload works (confirms `CLOUDINARY_*`)

---

## 3. Homepage Tests

**URL:** `http://localhost:3000`

- [ ] Hero section renders with the brand headline and artwork
- [ ] Primary CTA (e.g. "Start Creating") and a browse/explore CTA are visible
- [ ] Navigating "Start Creating" goes to `/create` (redirects to sign-in if unauthenticated)
- [ ] Navigating the browse CTA goes to `/feed`
- [ ] Header, theme toggle, and footer render
- [ ] Responsive at 375px / 768px / 1280px widths

---

## 4. Authentication Tests

Stack Auth provides the auth UI at `/handler/*`.

### Sign Up
1. [ ] Go to `/handler/sign-up`; the form renders (with FanFic Lab branding)
2. [ ] Create an account
3. [ ] On success you are redirected to `/create`
4. [ ] A `User` row is created in the DB on first authenticated page load (via `syncUser()`)

### Sign In
1. [ ] Go to `/handler/sign-in`; sign in
2. [ ] On success you are redirected to `/`

### Protected Routes (redirect to sign-in when logged out)
- [ ] `/create`
- [ ] `/profile`
- [ ] `/notifications`
- [ ] `/story/[id]/edit`

### Sign Out
- [ ] Sign out via the account UI; you return to a logged-out state

---

## 5. Story Creation (DreamWriter) Tests

**URL:** `http://localhost:3000/create` (requires auth)

> Each generation makes real OpenAI calls and costs credits/tokens.

### Happy Path
1. [ ] Enter a prompt, e.g. `三月七 × 丹恒，星穹列车上的一个甜向小故事`
2. [ ] Submit — progress streams live via SSE in this order:
       `parsing → planning → writing → checking → complete`
3. [ ] If the quality guard scores a draft below threshold, you may also see `revising`
       (the writer reruns; max 2 revisions)
4. [ ] On completion a result card shows the title, body, summary, word count, and suggestions
5. [ ] The finished story is saved (`POST /api/stories`) and you can open it in the reader

### Edge Cases
- [ ] Submitting an empty prompt returns a friendly error (no generation runs)
- [ ] Aborting/leaving mid-generation does not crash the app
- [ ] A failed stage surfaces a Chinese error message (see [§10](#10-observability--error-handling))

### Behind the scenes (optional, via `dev:studio` or logs)
- [ ] Structured JSON logs appear with `event: "dreamwriter.node.start"` per node
- [ ] Restarting the server mid-run leaves a resumable checkpoint in Postgres

---

## 6. Story Reader & Continue Tests

**URL:** `http://localhost:3000/story/[id]`

- [ ] Story title, summary, metadata (CP/tags/rating/word count) render
- [ ] Chapter content renders with the prose font; reading prefs (if present) apply
- [ ] View count increments on read
- [ ] Comments: post a comment; post a nested reply; like a comment
- [ ] Related stories appear (pgvector recommendations, once embeddings exist)
- [ ] **Continue**: open the continue dialog → a new AI-written chapter is appended
      (`POST /api/stories/[id]/continue`) and the total word count increases

---

## 7. Discovery Feed Tests

**URL:** `http://localhost:3000/feed`

- [ ] Story cards render in a grid with cover (or placeholder), title, author, tags, stats
- [ ] Filters work (fandom / ships / tags / rating / status as available)
- [ ] Sorting works (recent / popular / comments / word count)
- [ ] Infinite scroll loads more stories
- [ ] Clicking a card opens the reader

---

## 8. Social & Profile Tests

### Profile — `http://localhost:3000/profile` (auth)
- [ ] Avatar, display name, username, bio render
- [ ] Edit profile (display name, bio) saves and shows a success toast
- [ ] Avatar upload works (Cloudinary)
- [ ] Writing stats render (stories, total words, likes, comments)
- [ ] Your stories list renders; edit links to `/story/[id]/edit`; delete works with confirmation

### Public profile — `http://localhost:3000/users/[username]`
- [ ] Public profile renders for another user
- [ ] Follow / unfollow works; followers/following lists render
- [ ] Following a user generates a notification for them

### Notifications — `http://localhost:3000/notifications` (auth)
- [ ] Notifications list renders (likes, comments, follows)
- [ ] Unread state clears appropriately

---

## 9. Database & Persistence Tests

- [ ] A generated story persists across refresh and appears in the feed/profile
- [ ] Editing a story at `/story/[id]/edit` persists changes
- [ ] Adding a chapter via Continue persists and updates word count
- [ ] Each completed generation writes a `Generation` ledger row with an accurate `wordCount`
- [ ] Likes / comments / follows persist across refresh

---

## 10. Observability & Error Handling

- [ ] Agent logs are single-line JSON objects (machine-readable), e.g.
      `{"ts":"…","level":"info","event":"dreamwriter.node.start","node":"writer"}`
- [ ] A forced failure (e.g. invalid `OPENAI_API_KEY`) produces a `level:"warn"`/`"error"`
      JSON log with an `errorCode`, and the UI shows the mapped Chinese message
- [ ] `GET /api/health` reports `status` + `latency` for the database

---

## 11. Known Issues & Limitations

### Architecture
- Single deployable: the DreamWriter agent runs in-process; there is no separate agent service.
- Deploy is via GitHub Actions → DigitalOcean VPS (see `docs/DEPLOYMENT.md`).

### Current Limitations
1. **No automated tests** — these manual scenarios are the current coverage.
2. **Generation cost** — every creation/continue call hits OpenAI (real tokens).
3. **Recommendations** — related stories need embeddings; new stories get them asynchronously
   (and the backfill script `npm run backfill-embeddings` exists for older rows).
4. **Billing** — per-1k-words charging logic exists but live deduction is intentionally not
   wired on yet (generation is currently uncharged).
5. **No Redis** — the research cache is backed by Neon Postgres (`SourceResearchCache`);
   there is no Redis/Upstash dependency.

### Expected Behaviors
- Unauthenticated users are redirected to sign-in for protected routes.
- Story generation requires a valid `OPENAI_API_KEY`.
- Sign-up redirects to `/create`; sign-in redirects to `/`.

### Browser Compatibility
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+: supported.

### Production URL
| Service | URL |
|---------|-----|
| Frontend + Agent | https://fanfic-lab.tech |

---

## Reporting Issues

When reporting a problem, include:
- Steps to reproduce
- Expected vs actual behavior
- Relevant JSON log lines (terminal) and any browser console errors
- Browser and OS
