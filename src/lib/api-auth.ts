import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { stackServerApp } from "@/lib/stack";
import { AppError, ErrorCode } from "@/lib/errors";

/**
 * Resolve the current request's DB user, or throw a typed AppError.
 *
 * Centralizes the `getUser() -> findUnique(stackAuthId)` block that route
 * handlers and server actions were repeating inline. Throws:
 *  - UNAUTHORIZED when no Stack Auth session is present
 *  - NOT_FOUND when the Stack user has no synced Prisma User row
 */
export async function requireDbUser(): Promise<User> {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) throw new AppError(ErrorCode.UNAUTHORIZED);

  const dbUser = await prisma.user.findUnique({
    where: { stackAuthId: stackUser.id },
  });
  if (!dbUser) throw new AppError(ErrorCode.NOT_FOUND, "User not found");

  return dbUser;
}
