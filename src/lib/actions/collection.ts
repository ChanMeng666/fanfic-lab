"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireDbUser } from "@/lib/api-auth";
import { AppError, ErrorCode } from "@/lib/errors";

// 专题合集 / 书单: user-curated lists of stories (UGC curation). A collection
// has an owner; only the owner can edit membership. Public collections are
// browsable by anyone; private ones only by the owner.

const TITLE_MAX = 80;
const DESC_MAX = 500;
const MAX_COLLECTIONS_PER_USER = 100;

// Shared select for a story rendered as a card inside a collection.
const storyCardSelect = {
  id: true,
  title: true,
  summary: true,
  fandom: true,
  ships: true,
  tags: true,
  rating: true,
  status: true,
  isComplete: true,
  wordCount: true,
  viewCount: true,
  coverImageUrl: true,
  updatedAt: true,
  author: { select: { id: true, username: true, avatarUrl: true } },
  _count: { select: { likes: true, comments: true, chapters: true } },
} as const;

export async function createCollection(input: {
  title: string;
  description?: string;
  isPublic?: boolean;
}): Promise<{ id: string }> {
  const user = await requireDbUser();
  const title = input.title.trim();
  if (title.length < 1 || title.length > TITLE_MAX) {
    throw new AppError(ErrorCode.VALIDATION, `标题需在 1~${TITLE_MAX} 字之间`);
  }
  const description = input.description?.trim() || null;
  if (description && description.length > DESC_MAX) {
    throw new AppError(ErrorCode.VALIDATION, `简介过长（≤ ${DESC_MAX} 字）`);
  }

  const count = await prisma.collection.count({ where: { ownerId: user.id } });
  if (count >= MAX_COLLECTIONS_PER_USER) {
    throw new AppError(ErrorCode.VALIDATION, "合集数量已达上限");
  }

  const c = await prisma.collection.create({
    data: {
      ownerId: user.id,
      title,
      description,
      isPublic: input.isPublic ?? true,
    },
  });
  revalidatePath("/collections");
  return { id: c.id };
}

export async function updateCollection(input: {
  id: string;
  title?: string;
  description?: string;
  isPublic?: boolean;
}) {
  const user = await requireDbUser();
  const existing = await prisma.collection.findUnique({
    where: { id: input.id },
    select: { ownerId: true },
  });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, "合集不存在");
  if (existing.ownerId !== user.id) throw new AppError(ErrorCode.FORBIDDEN, "无权编辑");

  const title = input.title?.trim();
  if (title !== undefined && (title.length < 1 || title.length > TITLE_MAX)) {
    throw new AppError(ErrorCode.VALIDATION, `标题需在 1~${TITLE_MAX} 字之间`);
  }

  await prisma.collection.update({
    where: { id: input.id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
    },
  });
  revalidatePath("/collections");
  revalidatePath(`/collections/${input.id}`);
  return { ok: true };
}

export async function deleteCollection(id: string) {
  const user = await requireDbUser();
  const existing = await prisma.collection.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, "合集不存在");
  if (existing.ownerId !== user.id) throw new AppError(ErrorCode.FORBIDDEN, "无权删除");

  await prisma.collection.delete({ where: { id } });
  revalidatePath("/collections");
  return { ok: true };
}

export async function addStoryToCollection(collectionId: string, storyId: string) {
  const user = await requireDbUser();
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { ownerId: true },
  });
  if (!collection) throw new AppError(ErrorCode.NOT_FOUND, "合集不存在");
  if (collection.ownerId !== user.id) throw new AppError(ErrorCode.FORBIDDEN, "无权操作");

  const story = await prisma.story.findUnique({ where: { id: storyId }, select: { id: true } });
  if (!story) throw new AppError(ErrorCode.NOT_FOUND, "故事不存在");

  const agg = await prisma.collectionStory.aggregate({
    where: { collectionId },
    _max: { order: true },
  });
  try {
    await prisma.collectionStory.create({
      data: { collectionId, storyId, order: (agg._max.order ?? 0) + 1 },
    });
  } catch {
    // Already in the collection (unique violation) — idempotent.
  }
  await prisma.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });
  revalidatePath(`/collections/${collectionId}`);
  return { added: true };
}

export async function removeStoryFromCollection(collectionId: string, storyId: string) {
  const user = await requireDbUser();
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { ownerId: true },
  });
  if (!collection) throw new AppError(ErrorCode.NOT_FOUND, "合集不存在");
  if (collection.ownerId !== user.id) throw new AppError(ErrorCode.FORBIDDEN, "无权操作");

  await prisma.collectionStory.deleteMany({ where: { collectionId, storyId } });
  revalidatePath(`/collections/${collectionId}`);
  return { removed: true };
}

export async function getCollection(id: string, viewerId?: string | null) {
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      stories: {
        orderBy: [{ order: "asc" }, { addedAt: "asc" }],
        include: { story: { select: storyCardSelect } },
      },
    },
  });
  if (!collection) return null;
  // Private collections are visible only to their owner.
  if (!collection.isPublic && collection.owner.id !== viewerId) return null;
  return collection;
}

export async function getPublicCollections(opts?: { limit?: number; offset?: number }) {
  const collections = await prisma.collection.findMany({
    where: { isPublic: true },
    orderBy: { updatedAt: "desc" },
    take: opts?.limit ?? 30,
    skip: opts?.offset ?? 0,
    include: {
      owner: { select: { username: true, displayName: true, avatarUrl: true } },
      _count: { select: { stories: true } },
    },
  });
  return collections;
}

/** The current user's collections (for management + the add-to dialog). */
export async function getMyCollections() {
  const user = await requireDbUser();
  return prisma.collection.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { stories: true } } },
  });
}

/** My collections plus whether each already contains `storyId` (add-to dialog). */
export async function getMyCollectionsWithFlag(storyId: string) {
  const user = await requireDbUser();
  const collections = await prisma.collection.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { stories: true } },
      stories: { where: { storyId }, select: { id: true } },
    },
  });
  return collections.map((c) => ({
    id: c.id,
    title: c.title,
    isPublic: c.isPublic,
    storyCount: c._count.stories,
    contains: c.stories.length > 0,
  }));
}
