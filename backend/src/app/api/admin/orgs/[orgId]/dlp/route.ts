import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertMembership } from "@/lib/membership";

async function requireAdmin(orgId: string, userId: string) {
  const role = await assertMembership(orgId, userId);
  if (!["owner", "admin"].includes(role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  return role;
}

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  // members may read rules for transparency
  try {
    await assertMembership(orgId, (session.user as any).id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("dlp_rules")
    .select("id, pattern, is_blocking, description, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const actorId = (session.user as any).id as string;

  try {
    await requireAdmin(orgId, actorId);
    const body = await req.json();
    const pattern = (body?.pattern ?? "").toString().trim();
    const is_blocking = !!body?.is_blocking;
    const description = (body?.description ?? "").toString().trim();

    if (!pattern) return NextResponse.json({ error: "Pattern is required" }, { status: 400 });
    if (pattern.length > 4000) {
      return NextResponse.json({ error: "Pattern too long" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("dlp_rules")
      .insert({ org_id: orgId, pattern, is_blocking, description })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // audit
    try {
      await supabaseAdmin.from("audit_logs").insert({
        org_id: orgId,
        actor_id: actorId,
        action: "dlp_rule.created",
        target_type: "dlp_rule",
        target_id: data?.id ?? null,
        meta: { is_blocking, description },
      });
    } catch {}

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
