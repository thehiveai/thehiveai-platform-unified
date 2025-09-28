import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertMembership } from "@/lib/membership";

// ---- Settings model & defaults ----
type Settings = {
  modelEnabled: { openai: boolean; gemini: boolean; anthropic: boolean };
  retentionDays: number;          // message/audit retention
  legalHold: boolean;             // locks retention (no deletion)
};

const DEFAULT_SETTINGS: Settings = {
  modelEnabled: { openai: true, gemini: true, anthropic: true },
  retentionDays: 90,
  legalHold: false,
};

const ALLOWED_KEYS = new Set<keyof Settings>(["modelEnabled", "retentionDays", "legalHold"]);

async function loadTenantSettings(orgId: string): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .select("key, value")
    .eq("org_id", orgId);

  if (error) throw new Error(error.message);

  const merged: Settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const row of data ?? []) {
    if (ALLOWED_KEYS.has(row.key as keyof Settings)) {
      (merged as any)[row.key] = row.value;
    }
  }
  return merged;
}

async function upsertSetting(orgId: string, key: keyof Settings, value: any) {
  const { error } = await supabaseAdmin
    .from("tenant_settings")
    .upsert(
      { org_id: orgId, key, value },
      { onConflict: "org_id,key" }
    );
  if (error) throw new Error(error.message);
}

async function writeAudit(orgId: string, actorId: string, key: string, value: any) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      org_id: orgId,
      actor_id: actorId,
      action: "tenant_settings.updated",
      target_type: "tenant_settings",
      target_id: null,
      meta: { key, value },
    });
  } catch { /* non-blocking */ }
}

async function requireRole(orgId: string, userId: string): Promise<"owner" | "admin" | "member"> {
  const role = await assertMembership(orgId, userId);
  if (!["owner", "admin"].includes(role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  return role as "owner" | "admin";
}

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  // any member can read settings
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  try {
    await assertMembership(orgId, (session.user as any).id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const settings = await loadTenantSettings(orgId);
    return NextResponse.json({ settings, defaults: DEFAULT_SETTINGS });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Load failed" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = params.orgId;
  const actorId = (session.user as any).id as string;

  // admin/owner gate
  let actorRole: "owner" | "admin";
  try {
    actorRole = await requireRole(orgId, actorId);
  } catch (r: any) {
    return r instanceof Response ? r : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Partial<Settings>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate keys and owner-only constraints
  const keys = Object.keys(body ?? {}) as (keyof Settings)[];
  for (const k of keys) {
    if (!ALLOWED_KEYS.has(k)) {
      return NextResponse.json({ error: `Unsupported key: ${k as string}` }, { status: 400 });
    }
    if ((k === "legalHold" || k === "retentionDays") && actorRole !== "owner") {
      return NextResponse.json({ error: `${k} is owner-only` }, { status: 403 });
    }
  }

  // Validate values
  if (body.modelEnabled) {
    const v = body.modelEnabled as Settings["modelEnabled"];
    for (const p of ["openai", "gemini", "anthropic"] as const) {
      if (typeof v[p] !== "boolean") {
        return NextResponse.json({ error: `modelEnabled.${p} must be boolean` }, { status: 400 });
      }
    }
  }
  if (body.retentionDays !== undefined) {
    const n = Number(body.retentionDays);
    if (!Number.isFinite(n) || n < 1 || n > 3650) {
      return NextResponse.json({ error: "retentionDays must be between 1 and 3650" }, { status: 400 });
    }
  }
  if (body.legalHold !== undefined && typeof body.legalHold !== "boolean") {
    return NextResponse.json({ error: "legalHold must be boolean" }, { status: 400 });
  }

  // Apply updates
  try {
    for (const k of keys) {
      await upsertSetting(orgId, k, (body as any)[k]);
      await writeAudit(orgId, actorId, k as string, (body as any)[k]);
    }
    const settings = await loadTenantSettings(orgId);
    return NextResponse.json({ ok: true, settings });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}
