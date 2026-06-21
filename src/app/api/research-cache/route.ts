/**
 * Research Cache API Route (Neon Postgres-backed)
 *
 * Caching for Tavily + LLM research results, stored in the `SourceResearchCache`
 * table. Replaces the former Redis cache (see src/lib/research-cache.ts).
 *
 * GET:    Check if cached research exists for a source
 * POST:   Save research results to cache
 * DELETE: Clear cached research for a source
 */

import { NextRequest, NextResponse } from "next/server";
import { getCachedResearch, saveResearch, deleteResearch } from "@/lib/research-cache";
import { logger, errorFields } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const sourceName = request.nextUrl.searchParams.get("sourceName");
    if (!sourceName) {
      return NextResponse.json({ error: "sourceName is required" }, { status: 400 });
    }

    const cached = await getCachedResearch(sourceName);
    if (!cached) {
      return NextResponse.json({ cached: false, latency: Date.now() - startTime });
    }

    return NextResponse.json({
      cached: true,
      data: cached.data,
      searchCount: cached.searchCount,
      cachedAt: cached.cachedAt,
      ttlRemaining: cached.ttlRemainingSeconds,
      latency: Date.now() - startTime,
    });
  } catch (error) {
    logger.error("research_cache.get.failed", errorFields(error));
    return NextResponse.json(
      { error: "Failed to check cache", cached: false, latency: Date.now() - startTime },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { sourceName, sourceType, researchData } = await request.json();
    if (!sourceName || !researchData) {
      return NextResponse.json(
        { error: "sourceName and researchData are required" },
        { status: 400 },
      );
    }

    const { searchCount } = await saveResearch(sourceName, sourceType, researchData);
    return NextResponse.json({ success: true, searchCount, latency: Date.now() - startTime });
  } catch (error) {
    logger.error("research_cache.post.failed", errorFields(error));
    return NextResponse.json(
      { success: false, error: "Failed to save to cache", latency: Date.now() - startTime },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sourceName = request.nextUrl.searchParams.get("sourceName");
    if (!sourceName) {
      return NextResponse.json({ error: "sourceName is required" }, { status: 400 });
    }
    const deleted = await deleteResearch(sourceName);
    return NextResponse.json({
      success: deleted,
      message: deleted ? "Cache cleared" : "Cache key not found",
    });
  } catch (error) {
    logger.error("research_cache.delete.failed", errorFields(error));
    return NextResponse.json({ error: "Failed to delete cache" }, { status: 500 });
  }
}
