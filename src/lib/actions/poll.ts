"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireDbUser } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/errors";
import { createNotification } from "@/lib/actions/notification";

// 接龙投票 server actions (reads + cheap mutations). The paid LLM settlement
// lives in the SSE route /api/stories/[id]/polls/[pollId]/settle.

const MAX_OPEN_POLLS_PER_STORY = 10;
const MAX_OPTIONS_PER_POLL = 6;
const Q_MIN = 5;
const Q_MAX = 200;
const OPT_MIN = 3;
const OPT_MAX = 200;

export interface PollOptionView {
  id: string;
  label: string;
  voteCount: number;
  proposer: { username: string; displayName: string | null } | null;
}

export interface PollView {
  id: string;
  question: string;
  status: "OPEN" | "CLOSED" | "GENERATED";
  parentChapterId: string | null;
  resultBranchId: string | null;
  createdAt: Date;
  creator: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  options: PollOptionView[];
  totalVotes: number;
  myVoteOptionId: string | null;
}

/** All polls for a story, newest first, with the viewer's current vote. */
export async function getPollsForStory(
  storyId: string,
  currentUserId?: string | null
): Promise<PollView[]> {
  const polls = await prisma.branchPoll.findMany({
    where: { storyId },
    orderBy: { createdAt: "desc" },
    include: {
      creator: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      options: {
        orderBy: [{ voteCount: "desc" }, { createdAt: "asc" }],
        include: {
          proposer: { select: { username: true, displayName: true } },
        },
      },
      votes: currentUserId
        ? { where: { userId: currentUserId }, select: { optionId: true } }
        : false,
    },
  });

  return polls.map((p) => ({
    id: p.id,
    question: p.question,
    status: p.status,
    parentChapterId: p.parentChapterId,
    resultBranchId: p.resultBranchId,
    createdAt: p.createdAt,
    creator: p.creator,
    options: p.options.map((o) => ({
      id: o.id,
      label: o.label,
      voteCount: o.voteCount,
      proposer: o.proposer,
    })),
    totalVotes: p.options.reduce((sum, o) => sum + o.voteCount, 0),
    myVoteOptionId: Array.isArray(p.votes) && p.votes.length > 0 ? p.votes[0].optionId : null,
  }));
}

export async function createPoll(input: {
  storyId: string;
  parentChapterId: string;
  question: string;
  options: string[];
}) {
  const user = await requireDbUser();

  const question = input.question.trim();
  if (question.length < Q_MIN || question.length > Q_MAX) {
    throw new AppError(ErrorCode.VALIDATION, `问题需在 ${Q_MIN}~${Q_MAX} 字之间`);
  }
  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < 2) throw new AppError(ErrorCode.VALIDATION, "至少需要 2 个方向选项");
  if (options.length > MAX_OPTIONS_PER_POLL) {
    throw new AppError(ErrorCode.VALIDATION, `最多 ${MAX_OPTIONS_PER_POLL} 个选项`);
  }
  if (options.some((o) => o.length < OPT_MIN || o.length > OPT_MAX)) {
    throw new AppError(ErrorCode.VALIDATION, `每个选项需在 ${OPT_MIN}~${OPT_MAX} 字之间`);
  }

  const story = await prisma.story.findUnique({
    where: { id: input.storyId },
    select: { id: true, status: true, allowBranching: true, authorId: true, title: true },
  });
  if (!story) throw new AppError(ErrorCode.NOT_FOUND, "故事不存在");
  if (story.status !== "PUBLISHED") throw new AppError(ErrorCode.FORBIDDEN, "作品尚未发布");
  if (!story.allowBranching) throw new AppError(ErrorCode.FORBIDDEN, "作者已关闭读者续写");

  // The fork point must be a chapter of this story.
  const chapter = await prisma.chapter.findFirst({
    where: { id: input.parentChapterId, storyId: input.storyId },
    select: { id: true },
  });
  if (!chapter) throw new AppError(ErrorCode.NOT_FOUND, "分叉点不存在");

  const openCount = await prisma.branchPoll.count({
    where: { storyId: input.storyId, status: "OPEN" },
  });
  if (openCount >= MAX_OPEN_POLLS_PER_STORY) {
    throw new AppError(ErrorCode.VALIDATION, "该作品进行中的接龙投票过多");
  }

  const poll = await prisma.branchPoll.create({
    data: {
      storyId: input.storyId,
      parentChapterId: input.parentChapterId,
      creatorId: user.id,
      question,
      options: {
        create: options.map((label) => ({ label, proposerId: user.id })),
      },
    },
  });

  revalidatePath(`/story/${input.storyId}`);
  return { pollId: poll.id };
}

export async function addPollOption(input: { pollId: string; label: string }) {
  const user = await requireDbUser();
  const label = input.label.trim();
  if (label.length < OPT_MIN || label.length > OPT_MAX) {
    throw new AppError(ErrorCode.VALIDATION, `选项需在 ${OPT_MIN}~${OPT_MAX} 字之间`);
  }

  const poll = await prisma.branchPoll.findUnique({
    where: { id: input.pollId },
    select: { id: true, status: true, storyId: true, _count: { select: { options: true } } },
  });
  if (!poll) throw new AppError(ErrorCode.NOT_FOUND, "投票不存在");
  if (poll.status !== "OPEN") throw new AppError(ErrorCode.VALIDATION, "投票已结束");
  if (poll._count.options >= MAX_OPTIONS_PER_POLL) {
    throw new AppError(ErrorCode.VALIDATION, `最多 ${MAX_OPTIONS_PER_POLL} 个选项`);
  }

  await prisma.branchOption.create({
    data: { pollId: input.pollId, label, proposerId: user.id },
  });
  revalidatePath(`/story/${poll.storyId}`);
  return { ok: true };
}

export async function votePoll(input: { pollId: string; optionId: string }) {
  const user = await requireDbUser();

  const poll = await prisma.branchPoll.findUnique({
    where: { id: input.pollId },
    select: {
      id: true,
      status: true,
      storyId: true,
      creatorId: true,
      story: { select: { title: true } },
    },
  });
  if (!poll) throw new AppError(ErrorCode.NOT_FOUND, "投票不存在");
  if (poll.status !== "OPEN") throw new AppError(ErrorCode.VALIDATION, "投票已结束");

  const option = await prisma.branchOption.findFirst({
    where: { id: input.optionId, pollId: input.pollId },
    select: { id: true, label: true },
  });
  if (!option) throw new AppError(ErrorCode.NOT_FOUND, "选项不存在");

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId: input.pollId, userId: user.id } },
    select: { id: true, optionId: true },
  });

  // Idempotent: voting the same option again is a no-op.
  if (existing && existing.optionId === input.optionId) {
    return { ok: true };
  }

  await prisma.$transaction(async (tx) => {
    if (existing) {
      // Move the vote: decrement old option, point vote at the new one.
      await tx.branchOption.update({
        where: { id: existing.optionId },
        data: { voteCount: { decrement: 1 } },
      });
      await tx.pollVote.update({
        where: { id: existing.id },
        data: { optionId: input.optionId },
      });
    } else {
      await tx.pollVote.create({
        data: { pollId: input.pollId, optionId: input.optionId, userId: user.id },
      });
    }
    await tx.branchOption.update({
      where: { id: input.optionId },
      data: { voteCount: { increment: 1 } },
    });
  });

  // Notify the poll creator (createNotification skips self-votes).
  if (!existing) {
    await createNotification({
      recipientId: poll.creatorId,
      type: "poll_vote",
      payload: {
        actorId: user.id,
        actorName: user.displayName || user.username,
        actorUsername: user.username,
        actorAvatarUrl: user.avatarUrl,
        storyId: poll.storyId,
        storyTitle: poll.story.title,
        pollId: poll.id,
        optionLabel: option.label.slice(0, 60),
      },
    });
  }

  revalidatePath(`/story/${poll.storyId}`);
  return { ok: true };
}

export async function deletePoll(pollId: string) {
  const user = await requireDbUser();
  const poll = await prisma.branchPoll.findUnique({
    where: { id: pollId },
    select: { id: true, creatorId: true, storyId: true, status: true, story: { select: { authorId: true } } },
  });
  if (!poll) throw new AppError(ErrorCode.NOT_FOUND, "投票不存在");
  if (poll.creatorId !== user.id && poll.story.authorId !== user.id) {
    throw new AppError(ErrorCode.FORBIDDEN, "无权删除该投票");
  }
  if (poll.status === "GENERATED") {
    throw new AppError(ErrorCode.VALIDATION, "已结算的投票不可删除");
  }
  await prisma.branchPoll.delete({ where: { id: pollId } });
  revalidatePath(`/story/${poll.storyId}`);
  return { ok: true };
}
