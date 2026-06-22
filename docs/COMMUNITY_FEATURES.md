# Community & Social Layer

> The authoritative, current map of FanFic Lab's community features — every model, server
> action, route, and page that sits **around** the DreamWriter generation core. Read this
> alongside [`AGENTS.md`](../AGENTS.md) (architecture) and [`CLAUDE.md`](../CLAUDE.md) (UI rules).
> Last verified against the codebase: the full P0–P3 community suite is live in production.

FanFic Lab is not just a generator — it's a community that **co-creates, discovers, and returns**.
The features below form one loop:

```
generate ─▶ read ─▶ react / like / bookmark / comment
                         │
   reader continuations ◀┘  (branch续写 · 接龙投票)  ─▶ author canonizes ─▶ new canon chapter
                         └─ remix (二创) ─▶ a brand-new seeded story
discovery: feed · following feed · trending leaderboard · weekly picks · collections
retention: notifications · achievements + creation streak · cross-device reading progress
```

Everything reuses the existing conventions: server actions in `src/lib/actions/*.ts` (`"use server"`),
typed errors via `AppError`/`ErrorCode`, notifications via `createNotification` (auto-skips
self-notify), Lucide-only icons (no emoji), and the shared continuation engine for any reader-facing
AI writing.

---

## 1. Foundations already present

Likes, nested comments (+ comment likes), follows, public profiles, the discovery feed, the
notification data layer + bell + `/notifications` page, and pgvector "related stories" predate this
suite. The new work builds on them — it did **not** replace them.

- Story likes: `toggleLike` (`src/lib/actions/story.ts`) — popularity signal; drives `sortBy:"popular"` + author 获赞 stats.
- Comments: `addComment`/`getComments`/`updateComment`/`deleteComment`/`toggleCommentLike` (same file).
- Follows: `toggleFollow`/`getFollowers`/`getFollowing`/`isFollowing` (`src/lib/actions/user.ts`).
- Notifications: `src/lib/actions/notification.ts` (`createNotification`, `getNotifications`, …).

---

## 2. Signature feature — AI interactive co-creation (互动续写)

The differentiator: a published story becomes a **tree of community-explored continuations**.

### Shared continuation engine
`src/lib/actions/continuation-core.ts` (plain module, **not** `"use server"`) exports
`generateContinuation(ctx, send)` + `generateChapterTitle()`. It is the single writer-call engine
(no outline/quality/revision loop) shared by **three** callers, so prompt/behavior stay in lock-step:
1. Author chapter continuation — `src/app/api/stories/[id]/continue/route.ts`
2. Reader branch续写 — `src/app/api/stories/[id]/branches/route.ts`
3. Poll settlement — `src/app/api/stories/[id]/polls/[pollId]/settle/route.ts`

### Branch续写 (分支续写)
Any logged-in reader proposes "what happens next" off a chapter; the engine writes a candidate
**`StoryBranch`** — stored **outside** the canonical `Chapter` table so canon is never polluted.

- **Data:** `StoryBranch` (storyId, parentChapterId, proposerId, direction, title, content,
  wordCount, `status: BranchStatus { ACTIVE | CANONIZED | HIDDEN }`, canonizedChapterId) +
  `BranchLike` (unique `[userId, branchId]`). `Story.allowBranching` (author opt-out, default true).
  `Generation.branchId` links the ledger row to the produced branch.
- **Route:** `POST /api/stories/[id]/branches` (SSE). Gates: login required · story `PUBLISHED` &
  `allowBranching` · credit precheck (proposer pays; **live deduction stays off** but the
  `chargeContinuation` hook is wired) · per-user hourly cap (10) · per-fork-point caps (20 total,
  2 per user). Stages: `writing → titling → saving → complete`.
- **Actions** (`src/lib/actions/branch.ts`): `getBranchTree`, `getBranch`, `toggleBranchLike`,
  `canonizeBranch` (**author-only; the ONLY path that mutates canon** — creates a real `Chapter`,
  bumps `wordCount`, clears `isComplete`), `hideBranch`, `deleteBranch`.
- **UI:** `BranchTree` on the story page (grouped by fork chapter), `ProposeBranchDialog` (story +
  per-chapter reader entry points), dedicated branch reader at
  `src/app/(main)/story/[id]/branch/[branchId]/page.tsx`, `allowBranching` toggle in the story editor.
- **Attribution + achievement:** canonizing rewards the branch proposer (`onBranchAdopted`).

### 接龙投票 (branch poll)
A fork point poses several proposed directions; readers vote; the **author settles** and the winning
direction is fed into the same engine to produce a `StoryBranch` (attributed to the winning
proposer, paid by the settling author), which then flows through canonization.

- **Data:** `BranchPoll` (storyId, parentChapterId, creatorId, question, `status: PollStatus { OPEN |
  CLOSED | GENERATED }`, resultBranchId) · `BranchOption` (label, proposerId, denormalized
  `voteCount`) · `PollVote` (unique `[pollId, userId]` — one movable vote).
- **Actions** (`src/lib/actions/poll.ts`): `createPoll`, `addPollOption`, `votePoll` (moves vote in a
  tx), `getPollsForStory`, `deletePoll`.
- **Route:** `POST /api/stories/[id]/polls/[pollId]/settle` (SSE, **author-only**) — picks the
  winner, generates the branch, charges the author, notifies the winning voters.
- **UI:** `BranchPolls` on the story page (create form, live vote bars, propose direction, author
  settle, result link), above `BranchTree`.

### Remix (二创 / 衍生)
A remix is a **brand-new story seeded from an existing one** — rides entirely on the normal create
flow, no new generation path.

- **Data:** `Story.remixedFromId` self-relation (`remixedFrom` / `remixes`).
- **Actions** (`src/lib/actions/remix.ts`): `createRemixSeed` (prefill prompt + source attribution,
  **no generation**), `getRemixes`.
- **Flow:** `remixedFromId` is threaded `useStoryCreation.create → persistStory → POST /api/stories`,
  which validates the source, records the edge, and notifies the original author (`story_remixed`).
- **UI:** "二创" button → `/create?remixFrom=<id>` (banner + prefilled input), "二创自《X》"
  attribution on the reader, "衍生作品（被二创 N 次）" list on the source story page.

---

## 3. Discovery & personalization

| Feature | Where | Notes |
|---|---|---|
| **Following feed** | `/feed` 推荐/关注 toggle | `getFeedStories({ authorIds })` + `getFollowingAuthorIds()` (`user.ts`). Empty `authorIds` ⇒ empty feed. Login-gated / no-followed-authors empty states. |
| **Trending leaderboard** | `/trending` | `getTrendingStories(window, limit)` (`src/lib/actions/trending.ts`) — composite score `likes×3 + comments×2 + views` via raw SQL (counts `::int` to avoid BigInt); `week`/`month` windows filter by `publishedAt`. Ranked rows with rank badges + 热度 score. |
| **Weekly picks (本周精选)** | strip atop `/feed` 推荐 | `WeeklyPicks` (`src/components/feed/WeeklyPicks.tsx`) reuses `getTrendingStories("week")` with an all-time fallback so it's never empty. Deliberately a strip, not a duplicate page. |
| **Collections (专题合集 / 书单)** | `/collections`, `/collections/[id]` | UGC curation — see §5. |
| **Related stories** | story page | pgvector `getRelatedStories` (pre-existing). |

---

## 4. Engagement & retention

### Bookmarks (收藏) — distinct from likes
`Bookmark` model (same shape as `Like`). `toggleBookmark` / `getBookmarkedStories`
(`src/lib/actions/bookmark.ts`). Private save-for-later; no notification. Profile has separate
**点赞** and **收藏** tabs (the likes tab was previously mislabeled 收藏 — now corrected).

### Multi-reactions (多元反应)
`Reaction` model + `ReactionType { TEARS 催泪 | FIRE 带感 | MIND_BLOWN 脑洞 | SWEET 甜 }`, one per user
per story (re-picking toggles/replaces). `setReaction` / `getReactionSummary`
(`src/lib/actions/reaction.ts`). `ReactionBar` on the story reader (Lucide icons, **no emoji**).
Separate from Like (popularity) and Bookmark (save).

### Comment @mentions + share
- `addComment` parses `@handle` (ASCII + CJK), resolves real usernames, sends `mention`
  notifications — **deduped** against author/parent-commenter to avoid double-pinging. Mentions
  render as profile links in `CommentsSection`.
- `ShareButton` (`src/components/story/ShareButton.tsx`) — pure client-side copy link / X / Reddit /
  native share sheet.

### Reading progress (跨设备「继续阅读」)
Server-side resume, complementing the existing **client-side scroll restore** (`useReadingProgress`,
localStorage — kept for in-page position).
- **Data:** `ReadingProgress` (unique `[userId, storyId]`, `lastChapterNumber`).
- **Actions** (`src/lib/actions/reading-progress.ts`): `recordReadingProgress` (upsert, anonymous =
  no-op) + `getContinueReading`.
- **Tracking:** `ReadingProgressTracker` (mirrors `ViewTracker`) mounted in `ChapterReader` and the
  single-chapter `StoryReader`. Profile shows a **继续阅读** card.

### Achievements + creation streak (成就/打卡)
Gamified retention.
- **Data:** `UserAchievement` (unique `[userId, key]`) + `User.creationStreak` / `longestStreak` /
  `lastCreationAt`.
- **Catalog in code:** `src/lib/achievements.ts` — `初次启程 / 笔耕不辍 / 广受好评 / 七日不辍 /
  续写有功` (key → title/description/Lucide icon). The table only records who earned what.
- **Awarding** (`src/lib/actions/achievements.ts`): `grant` is idempotent (notifies only on first
  earn). Event hooks — **all best-effort, never block the triggering action**:
  - `onStorySaved` → `POST /api/stories` (story-count milestones + day-grained streak)
  - `onLikeAdded` → `toggleLike`
  - `onBranchAdopted` → `canonizeBranch`
- **UI:** profile **成就** card (earned/locked) + **连续创作** stat. `achievement_unlocked`
  notification (trophy) uses `actorId: "system"` so the self-notify guard doesn't drop it.

---

## 5. Collections (专题合集 / 书单)

User-curated story lists — UGC curation.

- **Data:** `Collection` (ownerId, title, description, `isPublic`) + `CollectionStory` (M2M with
  `order`, unique `[collectionId, storyId]`).
- **Actions** (`src/lib/actions/collection.ts`): `createCollection`, `updateCollection`,
  `deleteCollection`, `addStoryToCollection`, `removeStoryFromCollection`, `getCollection`
  (privacy-aware — private only to owner), `getPublicCollections`, `getMyCollections`,
  `getMyCollectionsWithFlag` (add-to dialog).
- **UI:** `/collections` browse (public + 我的合集 + create), `/collections/[id]` detail (StoryCard
  grid; owner edit/delete + per-story remove), `AddToCollectionDialog` on the story reader (toggle
  membership + inline create). `合集` nav link.

---

## 6. Notification types (current full set)

Defined in `src/lib/actions/notification.ts` (`NotificationType`) and rendered in **both**
`src/components/layout/NotificationBell.tsx` and
`src/app/(main)/(protected)/notifications/notifications-client.tsx` — **keep these two renderers in
sync when adding a type.**

`comment` · `reply` · `story_like` · `comment_like` · `follow` · `mention` ·
`branch_proposed` · `branch_like` · `branch_canonized` · `poll_vote` · `poll_generated` ·
`story_remixed` · `achievement_unlocked`

`NotificationPayload` carries the union of optional fields used across types (`storyId`,
`storyTitle`, `commentId`, `snippet`, `branchId`, `branchSnippet`, `pollId`, `optionLabel`,
`achievementTitle`).

---

## 7. Routes & pages added

**API routes** (`src/app/api/stories/[id]/...`): `branches/route.ts` (SSE),
`polls/[pollId]/settle/route.ts` (SSE). `POST /api/stories` now also accepts `remixedFromId`.

**Pages** (under `src/app/(main)/`): `trending/`, `collections/` + `collections/[id]/`,
`story/[id]/branch/[branchId]/`. The story page (`story/[id]/page.tsx`) now also renders
`BranchPolls` + `BranchTree` + the 衍生作品 list and fetches reactions/branches/polls/remixes.

**Server-action files added under `src/lib/actions/`:** `branch.ts`, `poll.ts`, `remix.ts`,
`reaction.ts`, `bookmark.ts`, `reading-progress.ts`, `achievements.ts`, `collection.ts`,
`trending.ts`, plus the non-action `continuation-core.ts`. Catalog: `src/lib/achievements.ts`.
New UI components live under `src/components/story/`, `src/components/feed/`, and
`src/components/collections/`.

---

## 8. Migrations (this suite)

All additive (new tables / nullable-or-defaulted columns), applied to Neon in order:

```
20260622120000_add_story_branches      StoryBranch, BranchLike, BranchStatus, Story.allowBranching, Generation.branchId
20260622130000_add_bookmark            Bookmark
20260622140000_add_branch_polls        BranchPoll, BranchOption, PollVote, PollStatus
20260622150000_add_story_remix         Story.remixedFromId (self-relation)
20260622160000_add_reactions           Reaction, ReactionType
20260622170000_add_reading_progress    ReadingProgress
20260622180000_add_achievements        UserAchievement + User streak fields
20260622190000_add_collections         Collection, CollectionStory
```

---

## 9. Conventions & gotchas specific to this layer

- **Reader-facing AI writing → reuse `continuation-core.ts`.** Don't add a second writer-call path;
  extend the shared engine so the author/branch/poll flows stay consistent.
- **Branches never touch canon.** Only `canonizeBranch` creates a real `Chapter`. Everything else
  reads/writes `StoryBranch`.
- **"Whoever triggers paid AI pays."** Branch/poll generation charges the triggering user via the
  existing `chargeContinuation` hook. Live deduction is still intentionally **off** (product
  decision) — the hooks are wired so flipping it needs no UI change.
- **Achievement / like / progress hooks are best-effort.** They're wrapped so a failure never blocks
  the user action that triggered them. Don't `await` them in a way that can surface an error to the
  user.
- **Two notification renderers.** Adding a `NotificationType` means updating the bell **and** the
  `/notifications` client; both `switch` on `n.type` with a `default` fallback.
- **`src/lib/hooks/useStory.ts` has a local `Story` interface that mirrors the Prisma scalar set.**
  When you add a scalar column to `Story` (e.g. `allowBranching`, `remixedFromId`), add it here too —
  a stale interface trips a TypeScript "insufficient overlap" error on the `as Story[]` cast in
  `useMyStories`. (Happened repeatedly during this suite; this is the fix.)
- **Lucide-only, no emoji** — reactions/achievements use Lucide icons (`Droplets`/`Flame`/`Lightbulb`/
  `Candy`, `Trophy`, etc.), never emoji, per `CLAUDE.md`. Note brand icons (e.g. `Twitter`) were
  removed from recent `lucide-react` — don't import them.
- **`getTrendingStories` casts counts to `::int`** in raw SQL so they don't return as `BigInt`.
