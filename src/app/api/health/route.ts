/**
 * Health Check API Route
 *
 * Returns status of all external services:
 * - Redis (cache)
 * - Database (Neon PostgreSQL)
 */

import { NextResponse } from "next/server";
import { redisCache } from "@/lib/redis";
import prisma from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    redis: {
      status: "up" | "down";
      latency?: number;
    };
    database: {
      status: "up" | "down";
      latency?: number;
    };
  };
}

export async function GET() {
  const health: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      redis: { status: "down" },
      database: { status: "down" },
    },
  };

  // Check Redis
  const redisStart = Date.now();
  try {
    const redisOk = await redisCache.ping();
    health.services.redis = {
      status: redisOk ? "up" : "down",
      latency: Date.now() - redisStart,
    };
  } catch {
    health.services.redis = {
      status: "down",
      latency: Date.now() - redisStart,
    };
  }

  // Check Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch {
    health.services.database = {
      status: "down",
      latency: Date.now() - dbStart,
    };
  }

  // Determine overall status
  const allUp = Object.values(health.services).every((s) => s.status === "up");
  const allDown = Object.values(health.services).every((s) => s.status === "down");

  if (allDown) {
    health.status = "unhealthy";
  } else if (!allUp) {
    health.status = "degraded";
  }

  return NextResponse.json(health, {
    status: health.status === "unhealthy" ? 503 : 200,
  });
}
