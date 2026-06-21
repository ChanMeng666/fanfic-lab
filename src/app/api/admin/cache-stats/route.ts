/**
 * Admin API: Cache Statistics (Neon Postgres-backed)
 *
 * View all cached research entries and usage statistics from the
 * `SourceResearchCache` table. Protected by the ADMIN_SECRET env var.
 *
 * GET    /api/admin/cache-stats?secret=xxx              — list entries + usage
 * DELETE /api/admin/cache-stats?secret=xxx&clear=all    — clear all entries
 * DELETE /api/admin/cache-stats?secret=xxx&source=Name  — clear one source
 */

import { NextRequest, NextResponse } from "next/server";
import { listResearch, clearAllResearch, deleteResearch } from "@/lib/research-cache";
import { logger, errorFields } from "@/lib/logger";

function unauthorized(request: NextRequest): NextResponse | null {
  const secret = request.nextUrl.searchParams.get("secret");
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET not configured on server" }, { status: 500 });
  }
  if (secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized. Provide valid ?secret= parameter" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = unauthorized(request);
  if (denied) return denied;

  try {
    const { entries, totalSearches } = await listResearch();
    return NextResponse.json({
      totalEntries: entries.length,
      totalSearches,
      entries,
      backend: "postgres",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("cache_stats.get.failed", errorFields(error));
    return NextResponse.json(
      { error: "Failed to fetch cache stats", timestamp: new Date().toISOString() },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const denied = unauthorized(request);
  if (denied) return denied;

  const clearAll = request.nextUrl.searchParams.get("clear") === "all";
  const sourceName = request.nextUrl.searchParams.get("source");

  try {
    if (clearAll) {
      const count = await clearAllResearch();
      return NextResponse.json({
        success: true,
        message: `Cleared ${count} cache entries`,
        timestamp: new Date().toISOString(),
      });
    }
    if (sourceName) {
      const deleted = await deleteResearch(sourceName);
      return NextResponse.json({
        success: deleted,
        message: deleted ? `Cleared cache for "${sourceName}"` : `No cache found for "${sourceName}"`,
        timestamp: new Date().toISOString(),
      });
    }
    return NextResponse.json({ error: "Specify ?clear=all or ?source=SourceName" }, { status: 400 });
  } catch (error) {
    logger.error("cache_stats.delete.failed", errorFields(error));
    return NextResponse.json({ error: "Failed to clear cache" }, { status: 500 });
  }
}
