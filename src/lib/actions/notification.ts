"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { revalidatePath } from "next/cache";

export type NotificationType =
  | "comment"
  | "reply"
  | "story_like"
  | "comment_like"
  | "follow"
  | "mention"
  // Community AI co-creation (互动续写)
  | "branch_proposed"
  | "branch_like"
  | "branch_canonized"
  // 接龙投票
  | "poll_vote"
  | "poll_generated"
  // 二创/衍生
  | "story_remixed"
  // 成就
  | "achievement_unlocked";

export interface NotificationPayload {
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorAvatarUrl?: string | null;
  storyId?: string;
  storyTitle?: string;
  commentId?: string;
  snippet?: string;
  // Set for branch_* notifications. branchSnippet is a short preview of the
  // reader's proposed direction.
  branchId?: string;
  branchSnippet?: string;
  // Set for poll_* notifications.
  pollId?: string;
  optionLabel?: string;
  // Set for achievement_unlocked.
  achievementTitle?: string;
}

async function currentDbUserId(): Promise<string | null> {
  try {
    const stackUser = await stackServerApp.getUser();
    if (!stackUser) return null;
    const dbUser = await prisma.user.findUnique({
      where: { stackAuthId: stackUser.id },
      select: { id: true },
    });
    return dbUser?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Internal helper used by other server actions when something happens that
 * the recipient should know about. Skips self-notifications. Errors are
 * swallowed because notification failures should never block the user
 * action that triggered them.
 */
export async function createNotification(input: {
  recipientId: string;
  type: NotificationType;
  payload: NotificationPayload;
}): Promise<void> {
  try {
    if (input.recipientId === input.payload.actorId) return;
    await prisma.notification.create({
      data: {
        userId: input.recipientId,
        type: input.type,
        payload: input.payload as unknown as object,
      },
    });
  } catch (e) {
    console.warn("[notifications] createNotification failed:", e);
  }
}

export async function getNotifications(opts?: { unreadOnly?: boolean; limit?: number }) {
  const userId = await currentDbUserId();
  if (!userId) return [];

  const items = await prisma.notification.findMany({
    where: {
      userId,
      ...(opts?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 50,
  });

  return items.map((n) => ({
    id: n.id,
    type: n.type as NotificationType,
    payload: n.payload as unknown as NotificationPayload,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }));
}

export async function getUnreadNotificationCount(): Promise<number> {
  const userId = await currentDbUserId();
  if (!userId) return 0;
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markNotificationRead(id: string) {
  const userId = await currentDbUserId();
  if (!userId) return { ok: false };
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const userId = await currentDbUserId();
  if (!userId) return { ok: false };
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { ok: true };
}
