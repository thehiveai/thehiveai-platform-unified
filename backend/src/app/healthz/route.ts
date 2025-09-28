import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface HealthCheck {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  uptime_ms: number;
  version?: string;
  checks: {
    database?: {
      status: "ok" | "error";
      latency_ms?: number;
      error?: string;
    };
    auth?: {
      status: "ok" | "error";
      error?: string;
    };
    environment?: {
      node_version: string;
      env: string;
      memory_usage: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
      };
    };
    general?: {
      status: "error";
      error: string;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck["checks"] = {};
  let overallStatus: "ok" | "degraded" | "error" = "ok";

  try {
    // Environment checks
    checks.environment = {
      node_version: process.version,
      env: process.env.NODE_ENV || "unknown",
      memory_usage: process.memoryUsage(),
    };

    // Database connectivity check (degrades on failure)
    try {
      const dbStart = Date.now();
      const { error } = await supabaseAdmin.from("orgs").select("id").limit(1);
      const dbLatency = Date.now() - dbStart;

      if (error) {
        checks.database = { status: "error", error: error.message };
        if (overallStatus === "ok") overallStatus = "degraded";
      } else {
        checks.database = { status: "ok", latency_ms: dbLatency };
      }
    } catch (dbError: any) {
      checks.database = { status: "error", error: String(dbError?.message ?? dbError) };
      if (overallStatus === "ok") overallStatus = "degraded";
    }

    // Auth service check (degrades if not configured)
    const hasAuthConfig = !!(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL);
    if (!hasAuthConfig) {
      checks.auth = { status: "error", error: "Missing auth configuration" };
      if (overallStatus === "ok") overallStatus = "degraded";
    } else {
      checks.auth = { status: "ok" };
    }

    const uptime = Date.now() - startTime;
    const response: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_ms: uptime,
      version: process.env.npm_package_version || "unknown",
      checks,
    };

    // ok -> 200, degraded -> 200
    const statusCode = 200;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    // Top-level failures: still return 200 with details
    const uptime = Date.now() - startTime;
    const errorResponse: HealthCheck = {
      status: "degraded",
      timestamp: new Date().toISOString(),
      uptime_ms: uptime,
      checks: {
        ...checks,
        general: { status: "error", error: String(error?.message ?? error) },
      },
    };

    return NextResponse.json(errorResponse, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Content-Type": "application/json",
      },
    });
  }
}

export async function HEAD() {
  // Always 200 for LB health checks
  return new Response(null, {
    status: 200,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

