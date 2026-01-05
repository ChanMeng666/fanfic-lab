/**
 * Research Cache Service
 * Caches Tavily search + LLM summarization results to save API costs
 *
 * Cache strategy:
 * - Normalize source names for consistent matching
 * - Cache valid for 30 days (configurable)
 * - Track usage count for analytics
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import type { SourceResearchData } from "../../lib/types/agent-state";

// Cache configuration
const CACHE_MAX_AGE_DAYS = 30;

// Initialize Prisma client for agent (Railway environment)
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[ResearchCache] DATABASE_URL not set, cache disabled");
    return null;
  }

  try {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error("[ResearchCache] Failed to create Prisma client:", error);
    return null;
  }
}

// Singleton prisma instance
let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient | null {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

/**
 * Normalize source name for cache key matching
 * "Mo Dao Zu Shi" -> "mo dao zu shi"
 * "  Harry Potter  " -> "harry potter"
 */
export function normalizeSourceName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Look up cached research data for a source
 * Returns null if not found or cache is stale
 */
export async function getCachedResearch(
  sourceName: string,
  sourceType: string
): Promise<SourceResearchData | null> {
  const db = getPrisma();
  if (!db) return null;

  const normalizedName = normalizeSourceName(sourceName);
  console.log("[ResearchCache] Looking up cache for:", normalizedName);

  try {
    const cached = await db.sourceResearchCache.findUnique({
      where: { normalizedName },
    });

    if (!cached) {
      console.log("[ResearchCache] Cache miss");
      return null;
    }

    // Check if cache is stale (older than CACHE_MAX_AGE_DAYS)
    const ageInDays =
      (Date.now() - cached.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > CACHE_MAX_AGE_DAYS) {
      console.log("[ResearchCache] Cache stale (age:", ageInDays.toFixed(1), "days)");
      return null;
    }

    // Update access stats
    await db.sourceResearchCache.update({
      where: { normalizedName },
      data: {
        searchCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    console.log("[ResearchCache] Cache hit! searchCount:", cached.searchCount + 1);
    return cached.researchData as unknown as SourceResearchData;
  } catch (error) {
    console.error("[ResearchCache] Lookup error:", error);
    return null;
  }
}

/**
 * Save research data to cache
 */
export async function saveResearchToCache(
  sourceName: string,
  sourceType: string,
  researchData: SourceResearchData
): Promise<boolean> {
  const db = getPrisma();
  if (!db) return false;

  const normalizedName = normalizeSourceName(sourceName);
  console.log("[ResearchCache] Saving to cache:", normalizedName);

  try {
    await db.sourceResearchCache.upsert({
      where: { normalizedName },
      update: {
        sourceName, // Update to latest casing
        sourceType,
        researchData: researchData as object,
        searchCount: { increment: 1 },
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        sourceName,
        sourceType,
        normalizedName,
        researchData: researchData as object,
        searchCount: 1,
        lastAccessedAt: new Date(),
      },
    });

    console.log("[ResearchCache] Successfully saved to cache");
    return true;
  } catch (error) {
    console.error("[ResearchCache] Save error:", error);
    return false;
  }
}

/**
 * Get cache statistics for analytics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalSearches: number;
  topSources: Array<{ sourceName: string; searchCount: number }>;
} | null> {
  const db = getPrisma();
  if (!db) return null;

  try {
    const [count, sum, topSources] = await Promise.all([
      db.sourceResearchCache.count(),
      db.sourceResearchCache.aggregate({
        _sum: { searchCount: true },
      }),
      db.sourceResearchCache.findMany({
        select: { sourceName: true, searchCount: true },
        orderBy: { searchCount: "desc" },
        take: 10,
      }),
    ]);

    return {
      totalEntries: count,
      totalSearches: sum._sum.searchCount || 0,
      topSources,
    };
  } catch (error) {
    console.error("[ResearchCache] Stats error:", error);
    return null;
  }
}
