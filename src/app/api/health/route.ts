/**
 * Health Check API Route
 *
 * Returns status of the database (Neon PostgreSQL). The DreamWriter agent runs
 * in-process and there is no Redis dependency.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  services: {
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
      database: { status: "down" },
    },
  };

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = { status: "up", latency: Date.now() - dbStart };
  } catch {
    health.services.database = { status: "down", latency: Date.now() - dbStart };
  }

  if (health.services.database.status === "down") {
    health.status = "unhealthy";
  }

  return NextResponse.json(health, {
    status: health.status === "unhealthy" ? 503 : 200,
  });
}
