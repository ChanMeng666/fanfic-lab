import { NextRequest } from "next/server";
import { stackServerApp } from "@/lib/stack";
import { prisma } from "@/lib/db";
import { chargeContinuation } from "@/lib/actions/credits";
import { generateContinuation } from "@/lib/actions/continuation-core";
import { createNotification } from "@/lib/actions/notification";

// Settle a 接龙投票: AUTHOR-ONLY. Picks the winning option and feeds its
// direction into the SAME branch generation engine (continuation-core) to
// produce a StoryBranch — attributed to whoever proposed the winning direction,
// paid for by the author who settles. Then notifies the winning voters.

const MAX_VOTER_NOTIFICATIONS = 50;

function jsonError(error: string, status: number, code?: string) {
  return new Response(JSON.stringify(code ? { error, code } : { error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; pollId: string }> }
) {
  const { id: storyId, pollId } = await context.params;

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

  // Only the story author may settle (it spends credits + advances the work).
  if (story.authorId !== dbUser.id) return jsonError("只有作者可以结算投票", 403);

  const poll = await prisma.branchPoll.findUnique({
    where: { id: pollId },
    include: { options: { orderBy: [{ voteCount: "desc" }, { createdAt: "asc" }] } },
  });
  if (!poll || poll.storyId !== storyId) return jsonError("投票不存在", 404);
  if (poll.status === "GENERATED") return jsonError("该投票已结算", 409, "VALIDATION");
  if (poll.options.length === 0) return jsonError("投票没有选项", 400);

  // Credit gate (author pays; live deduction stays off but the hook is wired).
  const credits = await prisma.userCredits.findUnique({
    where: { userId: dbUser.id },
    select: { balance: true },
  });
  if ((credits?.balance ?? 0) < 1) {
    return jsonError("额度不足，请充值后再结算", 402, "INSUFFICIENT_CREDITS");
  }

  // Winner = highest voteCount, tie broken by earliest createdAt (already sorted).
  const winner = poll.options[0];

  // Fork point: the poll's chapter, or the latest chapter if it was removed.
  const parentChapter =
    (poll.parentChapterId
      ? story.chapters.find((c) => c.id === poll.parentChapterId)
      : undefined) ?? story.chapters[story.chapters.length - 1];
  if (!parentChapter) return jsonError("找不到分叉点章节", 400);

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
          { story, priorChapters, direction: winner.label, nextChapterNumber },
          send
        );

        send({ stage: "saving", message: "正在保存胜出的续写分支…" });

        const branch = await prisma.storyBranch.create({
          data: {
            storyId,
            parentChapterId: parentChapter.id,
            // Attribute the branch to whoever proposed the winning direction.
            proposerId: winner.proposerId ?? poll.creatorId,
            direction: winner.label,
            title,
            content,
            wordCount,
            status: "ACTIVE",
          },
        });

        await prisma.branchPoll.update({
          where: { id: poll.id },
          data: { status: "GENERATED", resultBranchId: branch.id },
        });

        // Ledger + charge (author pays).
        let creditsCharged = 0;
        let newBalance: number | undefined;
        try {
          const generation = await prisma.generation.create({
            data: {
              userId: dbUser.id,
              type: "CONTINUATION",
              status: "COMPLETE",
              request: { kind: "poll", storyId, pollId, optionId: winner.id } as object,
              wordCount,
              storyId,
              branchId: branch.id,
            },
          });
          const charge = await chargeContinuation(generation.id, dbUser.id, wordCount);
          creditsCharged = charge.creditsCharged;
          newBalance = charge.newBalance;
        } catch (e) {
          console.warn("[polls/settle] charge failed:", e);
        }

        // Notify the voters who backed the winning option.
        try {
          const winnerVotes = await prisma.pollVote.findMany({
            where: { optionId: winner.id },
            select: { userId: true },
            take: MAX_VOTER_NOTIFICATIONS,
          });
          const settler = await prisma.user.findUnique({
            where: { id: dbUser.id },
            select: { username: true, displayName: true, avatarUrl: true },
          });
          for (const v of winnerVotes) {
            await createNotification({
              recipientId: v.userId,
              type: "poll_generated",
              payload: {
                actorId: dbUser.id,
                actorName: settler?.displayName || settler?.username || "作者",
                actorUsername: settler?.username || "",
                actorAvatarUrl: settler?.avatarUrl,
                storyId,
                storyTitle: story.title,
                branchId: branch.id,
                pollId: poll.id,
                optionLabel: winner.label.slice(0, 60),
              },
            });
          }
        } catch (e) {
          console.warn("[polls/settle] voter notify failed:", e);
        }

        send({
          stage: "complete",
          message: title
            ? `胜出方向已生成分支「${title}」（${wordCount.toLocaleString()} 字）`
            : `胜出方向已生成分支（${wordCount.toLocaleString()} 字）`,
          branchId: branch.id,
          title,
          wordCount,
          creditsCharged,
          newBalance,
        });
      } catch (err) {
        console.error("[polls/settle] failed:", err);
        send({
          stage: "error",
          error: err instanceof Error ? err.message : "结算失败",
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
