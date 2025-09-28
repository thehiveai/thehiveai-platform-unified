import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertMembership } from "@/lib/membership";

function toCsvRow(fields: string[]) {
  return fields.map(f => `"${(f ?? "").replace(/"/g, '""')}"`).join(",");
}

export async function GET(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const userId = (session.user as any).id as string;

  // Only owners can export
  const role = await assertMembership(orgId, userId);
  if (role !== "owner") return NextResponse.json({ error: "Owner required" }, { status: 403 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since"); // ISO
  const until = url.searchParams.get("until"); // ISO

  let q = supabaseAdmin
    .from("audit_logs")
    .select("id, actor_id, action, target_type, target_id, content_sha256, meta, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5000); // cap to prevent runaway exports; adjust as needed

  if (since) q = q.gte("created_at", since);
  if (until) q = q.lt("created_at", until);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // hydrate actor emails
  const actorIds = Array.from(new Set((data ?? []).map(r => r.actor_id).filter(Boolean)));
  let mapEmail = new Map<string, string>();
  if (actorIds.length) {
    const { data: actors } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .in("id", actorIds as string[]);
    (actors ?? []).forEach(u => mapEmail.set(u.id, u.email));
  }

  const header = ["created_at","action","actor_email","target_type","target_id","content_sha256","meta_json"];
  const lines = [toCsvRow(header)];
  for (const r of data ?? []) {
    lines.push(toCsvRow([
      r.created_at,
      r.action,
      r.actor_id ? (mapEmail.get(r.actor_id) ?? "") : "",
      r.target_type ?? "",
      r.target_id ?? "",
      r.content_sha256 ?? "",
      JSON.stringify(r.meta ?? {}),
    ]));
  }
  const csv = lines.join("\r\n");

  // Audit the export request (best effort)
  try {
    await supabaseAdmin.from("audit_logs").insert({
      org_id: orgId,
      actor_id: userId,
      action: "audit.export_csv",
      target_type: null,
      target_id: null,
      meta: { rows: (data ?? []).length, since, until },
    });
  } catch {}

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit_${orgId}_${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
