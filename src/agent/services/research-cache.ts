/**
 * Research Cache Service
 * Caches Tavily search + LLM summarization results to save API costs
 *
 * Cache strategy:
 * - Normalize source names for consistent matching
 * - Cache valid for 30 days (configurable)
 * - Track usage count for analytics
 *
 * Note: This service gracefully degrades if Prisma is not available
 * (e.g., on Railway where prisma generate may not have run)
 */

import type { SourceResearchData } from "../../lib/types/agent-state";

// Cache configuration
const CACHE_MAX_AGE_DAYS = 30;

// Prisma client type (dynamic import to handle missing module)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaClient: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaNeon: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any = null;
let prismaInitialized = false;
let prismaAvailable = false;

// Try to initialize Prisma (may fail if module not generated)
async function initPrisma(): Promise<boolean> {
  if (prismaInitialized) return prismaAvailable;
  prismaInitialized = true;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[ResearchCache] DATABASE_URL not set, cache disabled");
    return false;
  }

  try {
    // Dynamic imports to handle missing modules gracefully
    const prismaClientModule = await import("@prisma/client");
    const prismaNeonModule = await import("@prisma/adapter-neon");

    PrismaClient = prismaClientModule.PrismaClient;
    PrismaNeon = prismaNeonModule.PrismaNeon;

    const adapter = new PrismaNeon({ connectionString });
    prisma = new PrismaClient({ adapter });
    prismaAvailable = true;
    console.log("[ResearchCache] Prisma client initialized successfully");
    return true;
  } catch (error) {
    console.warn("[ResearchCache] Prisma not available, cache disabled:",
      error instanceof Error ? error.message : "Unknown error");
    prismaAvailable = false;
    return false;
  }
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
 * Returns null if not found, cache is stale, or Prisma unavailable
 */
export async function getCachedResearch(
  sourceName: string,
  sourceType: string
): Promise<SourceResearchData | null> {
  // Initialize Prisma (may fail gracefully)
  const available = await initPrisma();
  if (!available || !prisma) {
    console.log("[ResearchCache] Cache lookup skipped (Prisma not available)");
    return null;
  }

  const normalizedName = normalizeSourceName(sourceName);
  console.log("[ResearchCache] Looking up cache for:", normalizedName);

  try {
    const cached = await prisma.sourceResearchCache.findUnique({
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
    await prisma.sourceResearchCache.update({
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
 * Returns false if Prisma unavailable (graceful degradation)
 */
export async function saveResearchToCache(
  sourceName: string,
  sourceType: string,
  researchData: SourceResearchData
): Promise<boolean> {
  // Initialize Prisma (may fail gracefully)
  const available = await initPrisma();
  if (!available || !prisma) {
    console.log("[ResearchCache] Cache save skipped (Prisma not available)");
    return false;
  }

  const normalizedName = normalizeSourceName(sourceName);
  console.log("[ResearchCache] Saving to cache:", normalizedName);

  try {
    await prisma.sourceResearchCache.upsert({
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
  const available = await initPrisma();
  if (!available || !prisma) return null;

  try {
    const [count, sum, topSources] = await Promise.all([
      prisma.sourceResearchCache.count(),
      prisma.sourceResearchCache.aggregate({
        _sum: { searchCount: true },
      }),
      prisma.sourceResearchCache.findMany({
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
