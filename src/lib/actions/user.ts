"use server";

import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/actions/notification";

// Types for user operations
interface UpdateProfileInput {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
}

interface UpdatePreferencesInput {
  favoriteFandoms?: string[];
  favoriteShips?: string[];
  preferredTags?: string[];
  aiPersonality?: string;
  darkMode?: boolean;
}

// Helper to get current user
async function getCurrentUser() {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  let dbUser = await prisma.user.findUnique({
    where: { stackAuthId: user.id },
    include: { preferences: true },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        stackAuthId: user.id,
        email: user.primaryEmail || `${user.id}@fanficlab.local`,
        username: user.displayName?.toLowerCase().replace(/\s+/g, "_") || `user_${user.id.slice(0, 8)}`,
        displayName: user.displayName,
        avatarUrl: user.profileImageUrl,
        preferences: {
          create: {},
        },
      },
      include: { preferences: true },
    });
  }

  return dbUser;
}

// ============================================
// USER SYNC ACTION
// ============================================

/**
 * Syncs the Stack Auth user to the Prisma database.
 * Called by the Header component when a user is authenticated.
 * This ensures the database user is created immediately after login.
 * Safe to call multiple times (idempotent).
 */
export async function syncUser() {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    return null; // Not authenticated, return null (don't throw)
  }

  let dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        stackAuthId: stackUser.id,
        email: stackUser.primaryEmail || `${stackUser.id}@fanficlab.local`,
        username:
          stackUser.displayName?.toLowerCase().replace(/\s+/g, "_") ||
          `user_${stackUser.id.slice(0, 8)}`,
        displayName: stackUser.displayName,
        avatarUrl: stackUser.profileImageUrl,
        preferences: { create: {} },
      },
    });
  }

  return dbUser;
}

// ============================================
// PROFILE ACTIONS
// ============================================

export async function getProfile() {
  const user = await getCurrentUser();

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      preferences: true,
      _count: {
        select: {
          stories: true,
          followers: true,
          follows: true,
        },
      },
    },
  });

  return profile;
}

export async function getPublicProfile(username: string) {
  const profile = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      stories: {
        where: { status: "PUBLISHED" },
        include: {
          _count: {
            select: {
              likes: true,
              comments: true,
              chapters: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 10,
      },
      _count: {
        select: {
          stories: { where: { status: "PUBLISHED" } },
          followers: true,
          follows: true,
        },
      },
    },
  });

  return profile;
}

export async function updateProfile(input: UpdateProfileInput) {
  const user = await getCurrentUser();

  // Check if username is already taken (if changing)
  if (input.username && input.username !== user.username) {
    const existing = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existing) {
      throw new Error("Username already taken");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: input.displayName,
      username: input.username,
      bio: input.bio,
      avatarUrl: input.avatarUrl,
    },
  });

  revalidatePath("/profile");

  return updatedUser;
}

export async function updatePreferences(input: UpdatePreferencesInput) {
  const user = await getCurrentUser();

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...input,
    },
    update: input,
  });

  revalidatePath("/profile");

  return preferences;
}

// ============================================
// FOLLOW ACTIONS
// ============================================

export async function toggleFollow(targetUserId: string) {
  const user = await getCurrentUser();

  if (user.id === targetUserId) {
    throw new Error("Cannot follow yourself");
  }

  const existingFollow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: user.id,
        followingId: targetUserId,
      },
    },
  });

  if (existingFollow) {
    await prisma.follow.delete({
      where: { id: existingFollow.id },
    });
    return { following: false };
  } else {
    await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: targetUserId,
      },
    });

    await createNotification({
      recipientId: targetUserId,
      type: "follow",
      payload: {
        actorId: user.id,
        actorName: user.displayName || user.username,
        actorUsername: user.username,
        actorAvatarUrl: user.avatarUrl,
      },
    });

    return { following: true };
  }
}

export async function getFollowers(userId: string, limit = 20, offset = 0) {
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: { createdAt: "desc" },
  });

  return followers.map((f) => f.follower);
}

export async function getFollowing(userId: string, limit = 20, offset = 0) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: { createdAt: "desc" },
  });

  return following.map((f) => f.following);
}

export async function isFollowing(targetUserId: string) {
  try {
    const user = await getCurrentUser();

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    return !!follow;
  } catch {
    return false;
  }
}

// ============================================
// CHARACTER ACTIONS
// ============================================

export async function createCharacter(input: {
  name: string;
  fandom: string;
  canonDescription?: string;
  personalityTraits: string[];
  speechPatterns?: string;
  portraitUrl?: string;
  isOriginal: boolean;
}) {
  const user = await getCurrentUser();

  const character = await prisma.character.create({
    data: {
      name: input.name,
      fandom: input.fandom,
      canonDescription: input.canonDescription,
      personalityTraits: input.personalityTraits,
      speechPatterns: input.speechPatterns,
      portraitUrl: input.portraitUrl,
      isOriginal: input.isOriginal,
      creatorId: user.id,
    },
  });

  return character;
}

export async function getMyCharacters() {
  const user = await getCurrentUser();

  const characters = await prisma.character.findMany({
    where: {
      OR: [
        { creatorId: user.id },
        { isOriginal: false }, // Include canon characters
      ],
    },
    orderBy: [{ fandom: "asc" }, { name: "asc" }],
  });

  return characters;
}

export async function getCharactersByFandom(fandom: string) {
  const characters = await prisma.character.findMany({
    where: {
      fandom: {
        equals: fandom,
        mode: "insensitive",
      },
    },
    orderBy: { name: "asc" },
  });

  return characters;
}

// ============================================
// DRAFT ACTIONS (Database)
// ============================================

export async function saveDraft(input: {
  id?: string;
  title?: string;
  content: string;
  fandom?: string;
  ships?: string[];
  tags?: string[];
  aiContext?: object;
}) {
  const user = await getCurrentUser();

  if (input.id) {
    // Update existing draft
    const draft = await prisma.draft.update({
      where: { id: input.id },
      data: {
        title: input.title,
        content: input.content,
        fandom: input.fandom,
        ships: input.ships || [],
        tags: input.tags || [],
        aiContext: input.aiContext || undefined,
      },
    });
    return draft;
  } else {
    // Create new draft
    const draft = await prisma.draft.create({
      data: {
        title: input.title,
        content: input.content,
        fandom: input.fandom,
        ships: input.ships || [],
        tags: input.tags || [],
        aiContext: input.aiContext || undefined,
        userId: user.id,
      },
    });
    return draft;
  }
}

export async function getMyDrafts() {
  const user = await getCurrentUser();

  const drafts = await prisma.draft.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return drafts;
}

export async function getDraft(draftId: string) {
  const user = await getCurrentUser();

  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId: user.id,
    },
  });

  return draft;
}

export async function deleteDraft(draftId: string) {
  const user = await getCurrentUser();

  await prisma.draft.deleteMany({
    where: {
      id: draftId,
      userId: user.id,
    },
  });

  return { success: true };
}

// ============================================
// STATISTICS
// ============================================

export async function getUserStats() {
  const user = await getCurrentUser();

  const stats = await prisma.$transaction([
    prisma.story.count({ where: { authorId: user.id } }),
    prisma.story.count({ where: { authorId: user.id, status: "PUBLISHED" } }),
    prisma.story.aggregate({
      where: { authorId: user.id },
      _sum: { wordCount: true },
    }),
    prisma.like.count({
      where: { story: { authorId: user.id } },
    }),
    prisma.comment.count({
      where: { story: { authorId: user.id } },
    }),
    prisma.follow.count({ where: { followingId: user.id } }),
  ]);

  return {
    totalStories: stats[0],
    publishedStories: stats[1],
    totalWords: stats[2]._sum.wordCount || 0,
    totalLikes: stats[3],
    totalComments: stats[4],
    followers: stats[5],
  };
}

