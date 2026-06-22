import { NextRequest } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { prisma } from "@/lib/db";
import { chargeContinuation } from "@/lib/actions/credits";
import { generateContinuation } from "@/lib/actions/continuation-core";
import { createNotification } from "@/lib/actions/notification";

// Community AI 续写 (分支续写): any logged-in reader proposes a "what happens
// next" direction off a published story's chapter; the AI writes a candidate
// branch chapter. Branches are stored in StoryBranch (NOT Chapter) so they
// never touch canon — the author canonizes the best one via canonizeBranch.
//
// This route mirrors the author continue route 1:1 (same SSE stages, same
// shared generateContinuation engine) but writes a StoryBranch and adds the
// abuse/cost gates appropriate for letting readers trigger generation on
// someone else's story.

// Abuse / cost gates.
const MAX_BRANCHES_PER_USER_PER_HOUR = 10; // across all stories
const MAX_BRANCHES_PER_FORK = 20; // total active branches off one chapter
const MAX_BRANCHES_PER_USER_PER_FORK = 2; // one user can't dominate a fork point

interface BranchBody {
  parentChapterId: string;
  direction: string;
}

function jsonError(error: string, status: number, code?: string) {
  return new Response(JSON.stringify(code ? { error, code } : { error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: storyId } = await context.params;

  const stackUser = await stackServerApp.getUser();
  if (!stackUser) return jsonError("未登录", 401);

  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
    select: { id: true },
  });
  if (!dbUser) return jsonError("用户不存在", 404);

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { chapters: { orderBy: { chapterNumber: "asc" } } },
  });
  if (!story) return jsonError("故事不存在", 404);

  // Only published, branching-enabled stories accept community continuations.
  if (story.status !== "PUBLISHED") return jsonError("该作品尚未发布，暂不可续写", 403);
  if (!story.allowBranching) return jsonError("作者已关闭本作品的读者续写", 403);

  // Credit gate: branches are paid (word-based). Even though live deduction is
  // currently off, we enforce the future contract so flipping it needs no UI
  // change. The proposer (whoever triggers generation) pays.
  const credits = await prisma.userCredits.findUnique({
    where: { userId: dbUser.id },
    select: { balance: true },
  });
  if ((credits?.balance ?? 0) < 1) {
    return jsonError("额度不足，请充值后再续写", 402, "INSUFFICIENT_CREDITS");
  }

  let body: BranchBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求格式错误", 400);
  }

  const parentChapterId = (body.parentChapterId ?? "").trim();
  const direction = (body.direction ?? "").trim();
  if (!parentChapterId) return jsonError("缺少分叉点章节", 400);
  if (direction.length < 5) return jsonError("请描述续写的方向（至少 5 字）", 400);
  if (direction.length > 1000) return jsonError("方向描述过长（≤ 1000 字）", 400);

  // The fork point must be a chapter of this story.
  const parentChapter = story.chapters.find((c) => c.id === parentChapterId);
  if (!parentChapter) return jsonError("分叉点不存在", 404);

  // ---- Abuse / cost gates -------------------------------------------------
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentByUser = await prisma.generation.count({
    where: { userId: dbUser.id, type: "CONTINUATION", createdAt: { gte: oneHourAgo } },
  });
  if (recentByUser >= MAX_BRANCHES_PER_USER_PER_HOUR) {
    return jsonError("续写太频繁，请稍后再试", 429, "RATE_LIMIT");
  }

  const [forkTotal, forkByUser] = await Promise.all([
    prisma.storyBranch.count({
      where: { parentChapterId, status: "ACTIVE" },
    }),
    prisma.storyBranch.count({
      where: { parentChapterId, proposerId: dbUser.id, status: "ACTIVE" },
    }),
  ]);
  if (forkTotal >= MAX_BRANCHES_PER_FORK) {
    return jsonError("该分叉点的续写已达上限", 409, "VALIDATION");
  }
  if (forkByUser >= MAX_BRANCHES_PER_USER_PER_FORK) {
    return jsonError("你在该分叉点的续写已达上限", 409, "VALIDATION");
  }

  // Lineage context: all canonical chapters up to and including the fork point.
  const priorChapters = story.chapters.filter(
    (c) => c.chapterNumber <= parentChapter.chapterNumber
  );
  const nextChapterNumber = parentChapter.chapterNumber + 1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        const { content, title, wordCount } = await generateContinuation(
          { story, priorChapters, direction, nextChapterNumber },
          send
        );

        send({ stage: "saving", message: "正在保存续写分支…" });

        const branch = await prisma.storyBranch.create({
          data: {
            storyId,
            parentChapterId,
            proposerId: dbUser.id,
            direction,
            title,
            content,
            wordCount,
            status: "ACTIVE",
          },
        });

        // Ledger + charge (proposer pays). Charge failures must not lose the
        // saved branch.
        let creditsCharged = 0;
        let newBalance: number | undefined;
        try {
          const generation = await prisma.generation.create({
            data: {
              userId: dbUser.id,
              type: "CONTINUATION",
              status: "COMPLETE",
              request: { direction, storyId, parentChapterId, kind: "branch" } as object,
              wordCount,
              storyId,
              branchId: branch.id,
            },
          });
          const charge = await chargeContinuation(generation.id, dbUser.id, wordCount);
          creditsCharged = charge.creditsCharged;
          newBalance = charge.newBalance;
        } catch (e) {
          console.warn("[stories/branches] charge failed:", e);
        }

        // Notify the story author that a reader proposed a continuation.
        const proposer = await prisma.user.findUnique({
          where: { id: dbUser.id },
          select: { username: true, displayName: true, avatarUrl: true },
        });
        const snippet = direction.length > 80 ? direction.slice(0, 80) + "…" : direction;
        await createNotification({
          recipientId: story.authorId,
          type: "branch_proposed",
          payload: {
            actorId: dbUser.id,
            actorName: proposer?.displayName || proposer?.username || "读者",
            actorUsername: proposer?.username || "",
            actorAvatarUrl: proposer?.avatarUrl,
            storyId,
            storyTitle: story.title,
            branchId: branch.id,
            branchSnippet: snippet,
          },
        });

        send({
          stage: "complete",
          message: title
            ? `续写分支「${title}」已生成（${wordCount.toLocaleString()} 字）`
            : `续写分支已生成（${wordCount.toLocaleString()} 字）`,
          branchId: branch.id,
          title,
          wordCount,
          creditsCharged,
          newBalance,
        });
      } catch (err) {
        console.error("[stories/branches] failed:", err);
        send({
          stage: "error",
          error: err instanceof Error ? err.message : "续写失败",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
