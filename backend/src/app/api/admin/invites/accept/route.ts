export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// src/app/api/admin/invites/accept/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Normalize emails for safe compares
function normEmail(e?: string | null) {
  return (e ?? "").trim().toLowerCase();
}

// Simple JSON helper
async function readJson<T = any>(req: Request): Promise<T> {
  try {
    return await req.json();
  } catch {
    throw new Error("Invalid JSON");
  }
}

export async function POST(req: Request) {
  // 1) Require authenticated session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string | undefined;
  const userEmail = normEmail(session.user.email);
  if (!userId || !userEmail) {
    return NextResponse.json({ error: "Account is missing id or email" }, { status: 400 });
  }

  // 2) Parse input
  let token: string | undefined;
  try {
    const body = await readJson<{ token?: string }>(req);
    token = body.token?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // 3) Look up invite by token
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from("org_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (inviteErr || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite" }, { status: 404 });
  }

  // 4) Enforce email match (strongest guarantee the right person accepts)
  const inviteEmail = normEmail(invite.email);
  if (inviteEmail !== userEmail) {
    return NextResponse.json(
      {
        error:
          "This invite was issued to a different email address. Please sign in with the invited email to accept.",
        details: { invitedEmail: invite.email },
      },
      { status: 403 }
    );
  }

  // 5) If already accepted, return idempotently (and ensure membership exists)
  if (invite.accepted) {
    // Ensure membership exists; if not, create it idempotently
    const { data: existingMember } = await supabaseAdmin
      .from("org_members")
      .select("id")
      .eq("org_id", invite.org_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingMember) {
      await supabaseAdmin.from("org_members").insert({
        org_id: invite.org_id,
        user_id: userId,
        role: invite.role ?? "member",
      });
    }

    return NextResponse.json({ ok: true, alreadyAccepted: true });
  }

  // 6) Create membership (idempotent on unique(org_id, user_id))
  const { error: memberErr } = await supabaseAdmin.from("org_members").insert({
    org_id: invite.org_id,
    user_id: userId,
    role: invite.role ?? "member",
  });

  // If unique constraint hit because they’re already a member, continue gracefully
  if (memberErr && !memberErr.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: `Membership create failed: ${memberErr.message}` }, { status: 500 });
  }

  // 7) Mark invite accepted
  const { error: acceptErr } = await supabaseAdmin
    .from("org_invites")
    .update({ accepted: true, accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (acceptErr) {
    // Don’t leave half-done state: (optional) you could also delete the membership if needed.
    return NextResponse.json({ error: `Failed to finalize acceptance: ${acceptErr.message}` }, { status: 500 });
  }

  // 8) Audit log (best-effort; failure shouldn’t block acceptance)
  try {
    await supabaseAdmin.from("audit_logs").insert({
      org_id: invite.org_id,
      actor_id: userId,
      action: "invite.accepted",
      target_type: "org_member",
      target_id: null, // could select the new membership id if desired
      content_sha256: null,
      meta: {
        invite_id: invite.id,
        invite_email: invite.email,
        role: invite.role ?? "member",
      },
    });
  } catch {
    // swallow audit errors to avoid blocking user flow
  }

  return NextResponse.json({ ok: true });
}

