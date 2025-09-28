import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertMembership } from "@/lib/membership";

type Query = {
  limit?: string;            // default 50
  cursor?: string | null;    // created_at ISO string for keyset pagination
  actor?: string | null;     // actor email contains
  action?: string | null;    // exact action match or prefix
  since?: string | null;     // ISO start time
  until?: string | null;     // ISO end time (exclusive)
  q?: string | null;         // free text (search in meta JSON string)
};

export async function GET(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const userId = (session.user as any).id as string;

  // Any org member can read audits (transparency). RLS is enforced on the table already.
  try {
    await assertMembership(orgId, userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const qp: Query = {
    limit: url.searchParams.get("limit") ?? undefined,
    cursor: url.searchParams.get("cursor"),
    actor: url.searchParams.get("actor"),
    action: url.searchParams.get("action"),
    since: url.searchParams.get("since"),
    until: url.searchParams.get("until"),
    q: url.searchParams.get("q"),
  };

  const limit = Math.min(Math.max(parseInt(qp.limit || "50", 10) || 50, 1), 200);

  // Build query
  let query = supabaseAdmin
    .from("audit_logs")
    .select("id, org_id, actor_id, action, target_type, target_id, content_sha256, meta, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra for 'hasMore'

  // cursor: keyset on created_at
  if (qp.cursor) {
    query = query.lt("created_at", qp.cursor);
  }

  // since/until
  if (qp.since) query = query.gte("created_at", qp.since);
  if (qp.until) query = query.lt("created_at", qp.until);

  // action exact or prefix (prefix when endswith '*')
  if (qp.action) {
    if (qp.action.endsWith("*")) {
      query = query.like("action", qp.action.slice(0, -1) + "%");
    } else {
      query = query.eq("action", qp.action);
    }
  }

  // Join actor email via view query (do a second query to keep it simple)
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];

  // Optional: hydrate actor email
  // Collect unique actor_ids
  const actorIds = Array.from(new Set(rows.map(r => r.actor_id).filter(Boolean)));
  let mapEmail = new Map<string, string>();
  if (actorIds.length) {
    const { data: actors } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .in("id", actorIds as string[]);
    (actors ?? []).forEach(u => mapEmail.set(u.id, u.email));
  }

  // actor filter on email contains
  let filtered = rows.map(r => ({
    ...r,
    actor_email: r.actor_id ? mapEmail.get(r.actor_id) ?? null : null,
  }));

  if (qp.actor) {
    const needle = qp.actor.toLowerCase();
    filtered = filtered.filter(r => (r.actor_email ?? "").toLowerCase().includes(needle));
  }

  // q search against meta JSON string
  if (qp.q) {
    const needle = qp.q.toLowerCase();
    filtered = filtered.filter(r =>
      JSON.stringify(r.meta ?? {}).toLowerCase().includes(needle)
    );
  }

  const hasMore = filtered.length > limit;
  const slice = filtered.slice(0, limit);
  const nextCursor = hasMore ? slice[slice.length - 1].created_at : null;

  return NextResponse.json({
    items: slice,
    nextCursor,
    hasMore,
  });
}
