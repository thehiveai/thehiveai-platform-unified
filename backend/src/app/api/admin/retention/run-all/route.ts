// src/app/api/admin/retention/run-all/route.ts
import { NextResponse } from "next/server";
import { listOrgIds, purgeOrgOnce } from "@/lib/retention";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a || "");
  const bb = Buffer.from(b || "");
  if (ab.length !== bb.length) return false;
  try { return timingSafeEqual(ab, bb); } catch { return false; }
}

export async function POST(req: Request) {
  const given = req.headers.get("x-cron-token") || "";
  const expected = process.env.CRON_TOKEN || "";
  if (!expected || !safeEqual(given, expected)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dryRun = String(process.env.RETENTION_DRY_RUN || "").toLowerCase() === "true";

  try {
    const orgs = await listOrgIds();
    const results: Record<string, any> = {};
    for (const orgId of orgs) {
      const meta = await purgeOrgOnce(orgId, null, { dryRun });
      results[orgId] = meta;
    }
    return NextResponse.json({ ok: true, dryRun, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "run-all failed" }, { status: 500 });
  }
}
