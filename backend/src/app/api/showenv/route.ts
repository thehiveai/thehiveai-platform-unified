import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.SUPABASE_URL || "(missing)";
  const key = process.env.SUPABASE_SERVICE_ROLE || "(missing)";
  return NextResponse.json({
    seenUrl: url,
    seenKeyPrefix: key === "(missing)" ? "(missing)" : key.slice(0, 12),
  });
}
