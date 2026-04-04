/**
 * Admin API: Cache Statistics
 *
 * View all cached research entries and usage statistics.
 * Protected by ADMIN_SECRET environment variable.
 *
 * GET /api/admin/cache-stats?secret=xxx
 * Returns all cache entries with metadata and usage counts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRedisClient, REDIS_CONFIG } from "@/lib/redis";

interface CacheEntry {
  sourceName: string;
  sourceType: string;
  cachedAt: string;
  searchCount: number;
  ttlRemaining: number | null;
  ttlRemainingDays: string;
  charactersCount: number;
  shipsCount: number;
}

interface CacheStats {
  totalEntries: number;
  totalSearches: number;
  entries: CacheEntry[];
  redisConnected: boolean;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  // Check admin secret
  const secret = request.nextUrl.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET not configured on server" },
      { status: 500 }
    );
  }

  if (secret !== adminSecret) {
    return NextResponse.json(
      { error: "Unauthorized. Provide valid ?secret= parameter" },
      { status: 401 }
    );
  }

  const client = getRedisClient();

  if (!client) {
    return NextResponse.json({
      redisConnected: false,
      error: "Redis not connected. Check REDIS_URL configuration.",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Get all research cache keys
    const researchPattern = `${REDIS_CONFIG.KEY_PREFIX.RESEARCH}*`;
    const keys = await client.keys(researchPattern);

    const entries: CacheEntry[] = [];
    let totalSearches = 0;

    // Fetch data for each key
    for (const key of keys) {
      try {
        // Extract normalized name from key
        const normalizedName = key.replace(REDIS_CONFIG.KEY_PREFIX.RESEARCH, "");

        // Get cached data
        const dataStr = await client.get(key);
        if (!dataStr) continue;

        const data = JSON.parse(dataStr);

        // Get TTL
        const ttl = await client.ttl(key);

        // Get search count
        const statsKey = `${REDIS_CONFIG.KEY_PREFIX.STATS}${normalizedName}:count`;
        const countStr = await client.get(statsKey);
        const searchCount = countStr ? parseInt(countStr, 10) : 0;

        totalSearches += searchCount;

        entries.push({
          sourceName: data.sourceName || normalizedName,
          sourceType: data.sourceType || "unknown",
          cachedAt: data.cachedAt || "unknown",
          searchCount,
          ttlRemaining: ttl > 0 ? ttl : null,
          ttlRemainingDays: ttl > 0 ? `${Math.round(ttl / 86400)} days` : "expired",
          charactersCount: data.researchData?.mainCharacters?.length || 0,
          shipsCount: data.researchData?.popularShips?.length || 0,
        });
      } catch (err) {
        console.error(`[CacheStats] Error processing key ${key}:`, err);
      }
    }

    // Sort by search count (most popular first)
    entries.sort((a, b) => b.searchCount - a.searchCount);

    const stats: CacheStats = {
      totalEntries: entries.length,
      totalSearches,
      entries,
      redisConnected: true,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[CacheStats] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch cache stats",
        details: error instanceof Error ? error.message : "Unknown error",
        redisConnected: false,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/cache-stats?secret=xxx&clear=all
 * Clear all cache entries (use with caution!)
 *
 * DELETE /api/admin/cache-stats?secret=xxx&source=Mo%20Dao%20Zu%20Shi
 * Clear specific source cache
 */
export async function DELETE(request: NextRequest) {
  // Check admin secret
  const secret = request.nextUrl.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const client = getRedisClient();
  if (!client) {
    return NextResponse.json(
      { error: "Redis not connected" },
      { status: 500 }
    );
  }

  const clearAll = request.nextUrl.searchParams.get("clear") === "all";
  const sourceName = request.nextUrl.searchParams.get("source");

  try {
    if (clearAll) {
      // Clear all research cache entries
      const researchKeys = await client.keys(`${REDIS_CONFIG.KEY_PREFIX.RESEARCH}*`);
      const statsKeys = await client.keys(`${REDIS_CONFIG.KEY_PREFIX.STATS}*`);

      const allKeys = [...researchKeys, ...statsKeys];

      if (allKeys.length > 0) {
        await client.del(...allKeys);
      }

      return NextResponse.json({
        success: true,
        message: `Cleared ${researchKeys.length} cache entries and ${statsKeys.length} stats entries`,
        timestamp: new Date().toISOString(),
      });
    } else if (sourceName) {
      // Clear specific source
      const normalizedName = sourceName.toLowerCase().trim().replace(/\s+/g, " ");
      const cacheKey = `${REDIS_CONFIG.KEY_PREFIX.RESEARCH}${normalizedName}`;
      const statsKey = `${REDIS_CONFIG.KEY_PREFIX.STATS}${normalizedName}:count`;

      const deleted = await client.del(cacheKey, statsKey);

      return NextResponse.json({
        success: deleted > 0,
        message: deleted > 0
          ? `Cleared cache for "${sourceName}"`
          : `No cache found for "${sourceName}"`,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: "Specify ?clear=all or ?source=SourceName" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[CacheStats] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
