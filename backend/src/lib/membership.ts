// src/lib/membership.ts
import type { Session } from "next-auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Ensure there is a row in app.users for this session.
 * - If a user exists with this azure_oid -> return its internal id.
 * - Else if a user exists with this email -> update its azure_oid and return id.
 * - Else create a new user (internal id) with azure_oid/email/name and return id.
 */
export async function ensureUser(session: Session): Promise<string> {
  const u: any = session.user || {};
  const azureOid: string | null = u.oid ?? null;
  const email: string | null = u.email ?? u.preferred_username ?? u.upn ?? null;
  const name: string | null = u.name ?? null;

  if (!azureOid && !email) {
    throw new Error("Cannot ensure user: missing azure OID and email");
  }

  // 1) Try by azure_oid
  if (azureOid) {
    const byOid = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("azure_oid", azureOid)
      .maybeSingle();

    if (byOid.error) throw byOid.error;
    if (byOid.data?.id) return byOid.data.id;
  }

  // 2) Try by email; if found, attach azure_oid
  if (email) {
    const byEmail = await supabaseAdmin
      .from("users")
      .select("id, azure_oid")
      .eq("email", email)
      .maybeSingle();

    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.id) {
      if (azureOid && !byEmail.data.azure_oid) {
        const upd = await supabaseAdmin
          .from("users")
          .update({ azure_oid: azureOid })
          .eq("id", byEmail.data.id);
        if (upd.error) throw upd.error;
      }
      return byEmail.data.id;
    }
  }

  // 3) Create new user row
  const ins = await supabaseAdmin
    .from("users")
    .insert({ azure_oid: azureOid, email, name })
    .select("id")
    .single();

  if (ins.error) throw ins.error;
  return ins.data.id;
}

/** Best-effort email for labels/audit */
export function resolveEmail(session: Session): string | null {
  const u: any = session.user || {};
  return u.email ?? u.preferred_username ?? u.upn ?? null;
}

/** Server-side org resolver using memberships (internal user id) */
export async function resolveOrgId(userInternalId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("org_id, role, created_at")
    .eq("user_id", userInternalId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) throw new Error("User has no org memberships");
  if (data.length === 1) return data[0].org_id;

  const elevated = data.find(d => ["owner", "admin"].includes((d.role || "").toLowerCase()));
  return elevated?.org_id ?? data[0].org_id;
}

/** Defense-in-depth: ensure membership (internal user id) */
export async function assertMembership(orgId: string, userInternalId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", userInternalId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err: any = new Error("Forbidden: user is not a member of org");
    err.status = 403;
    throw err;
  }
}
