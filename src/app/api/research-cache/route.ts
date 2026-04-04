/**
 * Research Cache API Route (Redis-based)
 *
 * High-performance caching for Tavily + LLM research results
 *
 * GET: Check if cached research exists for a source
 * POST: Save research results to cache
 *
 * Best practices:
 * - Uses Redis for fast read/write (memory-based)
 * - Automatic TTL expiration (30 days)
 * - Separate counter for analytics
 * - Graceful degradation if Redis unavailable
 */

import { NextRequest, NextResponse } from "next/server";
import { redisCache, REDIS_CONFIG } from "@/lib/redis";
import type { SourceResearchData } from "@/lib/types/agent-state";

// Key generators
const getResearchKey = (normalizedName: string) =>
  `${REDIS_CONFIG.KEY_PREFIX.RESEARCH}${normalizedName}`;

const getStatsKey = (normalizedName: string) =>
  `${REDIS_CONFIG.KEY_PREFIX.STATS}${normalizedName}:count`;

/**
 * Normalize source name for cache key matching
 * "Mo Dao Zu Shi" -> "mo dao zu shi"
 */
function normalizeSourceName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Cached research data structure (includes metadata)
 */
interface CachedResearchData {
  sourceName: string;
  sourceType: string;
  researchData: SourceResearchData;
  cachedAt: string; // ISO date string
}

/**
 * GET /api/research-cache?sourceName=xxx&sourceType=xxx
 * Check if cached research exists
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceName = searchParams.get("sourceName");
    const sourceType = searchParams.get("sourceType");

    if (!sourceName) {
      return NextResponse.json(
        { error: "sourceName is required" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeSourceName(sourceName);
    const cacheKey = getResearchKey(normalizedName);
    const statsKey = getStatsKey(normalizedName);


    // Fetch from Redis
    const cached = await redisCache.get<CachedResearchData>(cacheKey);

    if (!cached) {

      return NextResponse.json({
        cached: false,
        latency: Date.now() - startTime,
      });
    }

    // Cache hit - increment access counter
    const searchCount = await redisCache.increment(statsKey) || 1;

    // Get remaining TTL for info
    const ttlRemaining = await redisCache.ttl(cacheKey);

    return NextResponse.json({
      cached: true,
      data: cached.researchData,
      searchCount,
      cachedAt: cached.cachedAt,
      ttlRemaining,
      latency: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[ResearchCache] GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to check cache",
        cached: false,
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/research-cache
 * Save research results to cache
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { sourceName, sourceType, researchData } = body;

    if (!sourceName || !researchData) {
      return NextResponse.json(
        { error: "sourceName and researchData are required" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeSourceName(sourceName);
    const cacheKey = getResearchKey(normalizedName);
    const statsKey = getStatsKey(normalizedName);

    // Prepare cache data with metadata
    const cacheData: CachedResearchData = {
      sourceName,
      sourceType: sourceType || "unknown",
      researchData,
      cachedAt: new Date().toISOString(),
    };

    // Save to Redis with TTL
    const success = await redisCache.set(
      cacheKey,
      cacheData,
      REDIS_CONFIG.RESEARCH_CACHE_TTL
    );

    if (!success) {
      console.error("[ResearchCache] Failed to save to Redis");
      return NextResponse.json(
        {
          success: false,
          error: "Redis unavailable",
          latency: Date.now() - startTime,
        },
        { status: 503 }
      );
    }

    // Initialize or increment counter
    const searchCount = await redisCache.increment(statsKey) || 1;

    return NextResponse.json({
      success: true,
      searchCount,
      ttl: REDIS_CONFIG.RESEARCH_CACHE_TTL,
      latency: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[ResearchCache] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save to cache",
        latency: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/research-cache?sourceName=xxx
 * Clear cached research (for admin/debugging)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceName = searchParams.get("sourceName");

    if (!sourceName) {
      return NextResponse.json(
        { error: "sourceName is required" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeSourceName(sourceName);
    const cacheKey = getResearchKey(normalizedName);

    const deleted = await redisCache.delete(cacheKey);

    return NextResponse.json({
      success: deleted,
      message: deleted ? "Cache cleared" : "Cache key not found or Redis unavailable",
    });
  } catch (error) {
    console.error("[ResearchCache] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete cache" },
      { status: 500 }
    );
  }
}
