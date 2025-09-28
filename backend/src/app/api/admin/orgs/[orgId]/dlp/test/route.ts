import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertMembership } from "@/lib/membership";

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const userId = (session.user as any).id as string;

  // Admins only (prevents exfiltration via mass testing)
  const role = await assertMembership(orgId, userId);
  if (!["owner", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const text = (body?.text ?? "").toString();
  if (!text) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const { data: rules, error } = await supabaseAdmin
    .from("dlp_rules")
    .select("id, pattern, is_blocking, description")
    .eq("org_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Evaluate in Node using JS RegExp; safe subset of PCRE
  const results: Array<{
    id: string;
    is_blocking: boolean;
    description: string | null;
    matches: Array<{ index: number; length: number; groups?: string[]; match: string }>;
  }> = [];

  for (const r of rules ?? []) {
    try {
      // Default "gmi" to catch multi-line and case-insensitive; adjust if you prefer strict
      const rx = new RegExp(r.pattern, "gmi");
      const matches: Array<{ index: number; length: number; groups?: string[]; match: string }> = [];
      let m: RegExpExecArray | null;
      while ((m = rx.exec(text)) !== null) {
        matches.push({
          index: m.index,
          length: m[0]?.length ?? 0,
          groups: m.slice(1).filter(Boolean),
          match: m[0] ?? "",
        });
        if (rx.lastIndex === m.index) rx.lastIndex++; // avoid zero-length infinite loops
      }
      if (matches.length > 0) {
        results.push({
          id: r.id,
          is_blocking: !!r.is_blocking,
          description: r.description ?? null,
          matches,
        });
      }
    } catch {
      // invalid regex; you could accumulate a list of invalid patterns if desired
    }
  }

  const blocked = results.some(r => r.is_blocking);
  return NextResponse.json({ blocked, results });
}
