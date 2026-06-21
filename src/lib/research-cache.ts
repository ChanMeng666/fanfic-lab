/**
 * Research cache — backed by Neon Postgres (the `SourceResearchCache` table).
 *
 * Replaces the former Redis (Upstash) cache. Postgres is already a hard dependency,
 * removes a moving part, and avoids the recurring "inactive free Redis gets deleted"
 * problem. TTL is emulated: rows older than RESEARCH_TTL_DAYS are treated as a miss
 * (and overwritten on the next save).
 */

import { prisma } from "@/lib/db";

export const RESEARCH_TTL_DAYS = 30;
const TTL_MS = RESEARCH_TTL_DAYS * 24 * 60 * 60 * 1000;

/** "Mo Dao Zu Shi" -> "mo dao zu shi" */
export function normalizeSourceName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export interface CachedResearch {
  data: unknown;
  sourceName: string;
  sourceType: string;
  searchCount: number;
  cachedAt: string;
  ttlRemainingSeconds: number;
}

/**
 * Look up cached research. On a fresh hit, bumps searchCount + lastAccessedAt.
 * Returns null on miss or when the entry is older than the TTL window.
 */
export async function getCachedResearch(sourceName: string): Promise<CachedResearch | null> {
  const normalizedName = normalizeSourceName(sourceName);
  const row = await prisma.sourceResearchCache.findUnique({ where: { normalizedName } });
  if (!row) return null;

  const ageMs = Date.now() - row.updatedAt.getTime();
  if (ageMs > TTL_MS) return null; // expired → treat as miss so it refreshes

  const updated = await prisma.sourceResearchCache.update({
    where: { normalizedName },
    data: { searchCount: { increment: 1 }, lastAccessedAt: new Date() },
  });

  return {
    data: updated.researchData,
    sourceName: updated.sourceName,
    sourceType: updated.sourceType,
    searchCount: updated.searchCount,
    cachedAt: updated.updatedAt.toISOString(),
    ttlRemainingSeconds: Math.max(0, Math.floor((TTL_MS - ageMs) / 1000)),
  };
}

/** Upsert research for a source (resets the TTL window via updatedAt). */
export async function saveResearch(
  sourceName: string,
  sourceType: string,
  researchData: unknown,
): Promise<{ searchCount: number }> {
  const normalizedName = normalizeSourceName(sourceName);
  const row = await prisma.sourceResearchCache.upsert({
    where: { normalizedName },
    create: {
      sourceName,
      sourceType: sourceType || "unknown",
      normalizedName,
      researchData: researchData as object,
    },
    update: {
      sourceName,
      sourceType: sourceType || "unknown",
      researchData: researchData as object,
      searchCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });
  return { searchCount: row.searchCount };
}

/** Delete one source's cached research. Returns true if a row was removed. */
export async function deleteResearch(sourceName: string): Promise<boolean> {
  const normalizedName = normalizeSourceName(sourceName);
  const res = await prisma.sourceResearchCache.deleteMany({ where: { normalizedName } });
  return res.count > 0;
}

/** Clear all cached research. Returns the number of rows removed. */
export async function clearAllResearch(): Promise<number> {
  const res = await prisma.sourceResearchCache.deleteMany({});
  return res.count;
}

export interface ResearchCacheEntry {
  sourceName: string;
  sourceType: string;
  cachedAt: string;
  searchCount: number;
  ttlRemainingDays: string;
}

/** List cache entries for the admin view, most-used first. */
export async function listResearch(): Promise<{ entries: ResearchCacheEntry[]; totalSearches: number }> {
  const rows = await prisma.sourceResearchCache.findMany({ orderBy: { searchCount: "desc" } });
  const now = Date.now();
  const entries = rows.map((r) => {
    const remainingMs = TTL_MS - (now - r.updatedAt.getTime());
    return {
      sourceName: r.sourceName,
      sourceType: r.sourceType,
      cachedAt: r.updatedAt.toISOString(),
      searchCount: r.searchCount,
      ttlRemainingDays: remainingMs > 0 ? `${Math.round(remainingMs / 86_400_000)} days` : "expired",
    };
  });
  return { entries, totalSearches: rows.reduce((sum, r) => sum + r.searchCount, 0) };
}
