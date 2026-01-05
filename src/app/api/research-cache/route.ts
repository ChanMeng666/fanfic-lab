/**
 * Research Cache API Route
 * Handles caching of Tavily + LLM research results on Vercel
 *
 * GET: Check if cached research exists for a source
 * POST: Save research results to cache
 *
 * This runs on Vercel where Prisma is properly configured,
 * avoiding the need to debug Prisma on Railway.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { SourceResearchData } from "@/lib/types/agent-state";

// Cache configuration
const CACHE_MAX_AGE_DAYS = 30;

/**
 * Normalize source name for cache key matching
 * "Mo Dao Zu Shi" -> "mo dao zu shi"
 */
function normalizeSourceName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * GET /api/research-cache?sourceName=xxx&sourceType=xxx
 * Check if cached research exists
 */
export async function GET(request: NextRequest) {
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
    console.log("[ResearchCache API] Looking up cache for:", normalizedName);

    const cached = await prisma.sourceResearchCache.findUnique({
      where: { normalizedName },
    });

    if (!cached) {
      console.log("[ResearchCache API] Cache miss");
      return NextResponse.json({ cached: false });
    }

    // Check if cache is stale (older than CACHE_MAX_AGE_DAYS)
    const ageInDays =
      (Date.now() - cached.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays > CACHE_MAX_AGE_DAYS) {
      console.log("[ResearchCache API] Cache stale (age:", ageInDays.toFixed(1), "days)");
      return NextResponse.json({ cached: false, stale: true });
    }

    // Update access stats
    await prisma.sourceResearchCache.update({
      where: { normalizedName },
      data: {
        searchCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    console.log("[ResearchCache API] Cache hit! searchCount:", cached.searchCount + 1);

    return NextResponse.json({
      cached: true,
      data: cached.researchData as unknown as SourceResearchData,
      searchCount: cached.searchCount + 1,
    });
  } catch (error) {
    console.error("[ResearchCache API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to check cache", cached: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/research-cache
 * Save research results to cache
 */
export async function POST(request: NextRequest) {
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
    console.log("[ResearchCache API] Saving to cache:", normalizedName);

    await prisma.sourceResearchCache.upsert({
      where: { normalizedName },
      update: {
        sourceName,
        sourceType: sourceType || "unknown",
        researchData: researchData as object,
        searchCount: { increment: 1 },
        lastAccessedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        sourceName,
        sourceType: sourceType || "unknown",
        normalizedName,
        researchData: researchData as object,
        searchCount: 1,
        lastAccessedAt: new Date(),
      },
    });

    console.log("[ResearchCache API] Successfully saved to cache");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ResearchCache API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to save to cache" },
      { status: 500 }
    );
  }
}
