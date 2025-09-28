import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertMembership } from "@/lib/membership";

// Helpers
async function requireAdmin(orgId: string, userId: string) {
  const role = await assertMembership(orgId, userId);
  if (!["owner", "admin"].includes(role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  return role;
}

async function countOwners(orgId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("role", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role", "owner");
  if (error) throw new Error(error.message);
  return data ? (data as unknown as number) : 0; // head:true returns count in header; supabase-js v2 uses data === null; count available via .count
}

async function ownersCount(orgId: string): Promise<number> {
  // explicit query to avoid head/count quirks
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("role", "owner");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const userId = (session.user as any).id as string;
  try {
    await requireAdmin(orgId, userId);
  } catch (e: any) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("user_id, role, created_at, users:users(id, email, name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    members: (data ?? []).map((m: any) => ({
      userId: m.user_id,
      role: m.role,
      email: m.users?.email,
      name: m.users?.name,
      joinedAt: m.created_at,
    })),
  });
}

export async function PUT(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const actorId = (session.user as any).id as string;

  try {
    const actorRole = await requireAdmin(orgId, actorId);

    const { userId, role } = await req.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "Missing userId or role" }, { status: 400 });
    }
    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent demoting the last owner
    if (role !== "owner") {
      // if target currently owner and is last, block
      const { data: target, error: targetErr } = await supabaseAdmin
        .from("org_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .single();
      if (targetErr) return NextResponse.json({ error: targetErr.message }, { status: 500 });

      if (target?.role === "owner") {
        const owners = await ownersCount(orgId);
        if (owners <= 1) {
          return NextResponse.json(
            { error: "Cannot demote the last remaining owner." },
            { status: 409 }
          );
        }
      }
    }

    // Only owners can promote to owner
    if (role === "owner" && actorRole !== "owner") {
      return NextResponse.json(
        { error: "Only an owner can promote another user to owner." },
        { status: 403 }
      );
    }

    const { error: updErr } = await supabaseAdmin
      .from("org_members")
      .update({ role })
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Audit log (best-effort)
    try {
      await supabaseAdmin.from("audit_logs").insert({
        org_id: orgId,
        actor_id: actorId,
        action: "org_member.role_changed",
        target_type: "org_member",
        target_id: userId,
        meta: { new_role: role },
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const actorId = (session.user as any).id as string;

  try {
    await requireAdmin(orgId, actorId);

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // Prevent removing the last owner
    const { data: target, error: targetErr } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();
    if (targetErr) return NextResponse.json({ error: targetErr.message }, { status: 500 });

    if (target?.role === "owner") {
      const owners = await ownersCount(orgId);
      if (owners <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last remaining owner." },
          { status: 409 }
        );
      }
    }

    const { error: delErr } = await supabaseAdmin
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Audit log
    try {
      await supabaseAdmin.from("audit_logs").insert({
        org_id: orgId,
        actor_id: actorId,
        action: "org_member.removed",
        target_type: "org_member",
        target_id: userId,
      });
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return e instanceof Response ? e : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
