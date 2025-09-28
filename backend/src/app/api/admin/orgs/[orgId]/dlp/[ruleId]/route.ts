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

export async function PUT(
  req: Request,
  { params }: { params: { orgId: string; ruleId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const ruleId = params.ruleId;
  const actorId = (session.user as any).id as string;

  try {
    await requireAdmin(orgId, actorId);
    const body = await req.json();
    const updates: any = {};
    if (typeof body?.pattern === "string") {
      const pattern = body.pattern.trim();
      if (!pattern) return NextResponse.json({ error: "Pattern cannot be empty" }, { status: 400 });
      if (pattern.length > 4000) return NextResponse.json({ error: "Pattern too long" }, { status: 400 });
      updates.pattern = pattern;
    }
    if (typeof body?.is_blocking === "boolean") updates.is_blocking = body.is_blocking;
    if (typeof body?.description === "string") updates.description = body.description.trim();

    const { error } = await supabaseAdmin
      .from("dlp_rules")
      .update(updates)
      .eq("org_id", orgId)
      .eq("id", ruleId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // audit
    try {
      await supabaseAdmin.from("audit_logs").insert({
        org_id: orgId,
        actor_id: actorId,
        action: "dlp_rule.updated",
        target_type: "dlp_rule",
        target_id: ruleId,
        meta: updates,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { orgId: string; ruleId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const ruleId = params.ruleId;
  const actorId = (session.user as any).id as string;

  try {
    await requireAdmin(orgId, actorId);

    const { error } = await supabaseAdmin
      .from("dlp_rules")
      .delete()
      .eq("org_id", orgId)
      .eq("id", ruleId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // audit
    try {
      await supabaseAdmin.from("audit_logs").insert({
        org_id: orgId,
        actor_id: actorId,
        action: "dlp_rule.deleted",
        target_type: "dlp_rule",
        target_id: ruleId,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
