// src/lib/retention.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type TenantSettings = {
  modelEnabled: { openai: boolean; gemini: boolean; anthropic: boolean };
  retentionDays: number;
  legalHold: boolean;
};

const DEFAULT_SETTINGS: TenantSettings = {
  modelEnabled: { openai: true, gemini: false, anthropic: false },
  retentionDays: 90,
  legalHold: false,
};

// Guardrails
const FLOOR_DAYS = 30;
const AUDIT_PURGE_DAYS = 365;
const BATCH_SIZE = 5000;
const SELECT_CHUNK = 1000;

function clampRetention(days: number) {
  return Math.max(FLOOR_DAYS, Math.floor(days || FLOOR_DAYS));
}

async function loadTenantSettings(orgId: string): Promise<TenantSettings> {
  const { data, error } = await supabaseAdmin
    .from("tenant_settings")
    .select("key, value")
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  const merged: TenantSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const row of data ?? []) {
    if (row.key in merged) (merged as any)[row.key] = row.value;
  }
  return merged;
}

async function insertAudit(orgId: string, actorId: string | null, action: string, meta: any) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      org_id: orgId,
      actor_id: actorId,
      action,
      target_type: "retention",
      target_id: null,
      content_sha256: null,
      meta,
    });
  } catch (e) {
    console.error("retention audit insert error", e);
  }
}

function isoNowMinusDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

async function selectIds(
  table: "messages" | "model_invocations" | "audit_logs" | "threads",
  filters: { orgId: string; cutoffISO?: string; orphanThreads?: boolean },
  limit: number
): Promise<string[]> {
  const out: string[] = [];
  let offset = 0;
  const page = SELECT_CHUNK;

  while (out.length < limit) {
    if (table === "threads" && filters.orphanThreads) {
      // 1) Page candidate threads
      const { data: threads, error: tErr } = await supabaseAdmin
        .from("threads")
        .select("id")
        .eq("org_id", filters.orgId)
        .order("created_at", { ascending: true })
        .range(offset, offset + page - 1);
      if (tErr) throw new Error(tErr.message);
      const candidateIds = (threads ?? []).map((r: any) => r.id as string);
      if (candidateIds.length === 0) break;

      // 2) Which of those have messages?
      const { data: hasMsgs, error: mErr } = await supabaseAdmin
        .from("messages")
        .select("thread_id")
        .in("thread_id", candidateIds);
      if (mErr) throw new Error(mErr.message);
      const withMsgs = new Set((hasMsgs ?? []).map((m: any) => m.thread_id as string));

      // 3) Keep true orphans
      for (const id of candidateIds) {
        if (!withMsgs.has(id)) {
          out.push(id);
          if (out.length >= limit) break;
        }
      }

      if (threads!.length < page) break;
      offset += page;
    } else {
      // Time-based selects
      const { data, error } = await supabaseAdmin
        .from(table)
        .select("id")
        .eq("org_id", filters.orgId)
        .lte("created_at", filters.cutoffISO ?? new Date(0).toISOString())
        .order("created_at", { ascending: true })
        .range(offset, offset + page - 1);
      if (error) throw new Error(error.message);
      const ids = (data ?? []).map((r: any) => r.id as string);
      out.push(...ids);
      if (ids.length < page) break;
      offset += page;
    }
  }

  return out.slice(0, limit);
}

async function deleteByIds(
  table: "messages" | "model_invocations" | "audit_logs" | "threads",
  ids: string[]
) {
  if (ids.length === 0) return 0;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += SELECT_CHUNK) {
    const chunk = ids.slice(i, i + SELECT_CHUNK);
    const { data, error } = await supabaseAdmin
      .from(table)
      .delete()
      .in("id", chunk)
      .select("id");
    if (error) throw new Error(error.message);
    deleted += (data ?? []).length;
  }
  return deleted;
}

export async function purgeOrgOnce(
  orgId: string,
  actorId: string | null,
  opts?: { dryRun?: boolean }
) {
  const settings = await loadTenantSettings(orgId);
  const effectiveDays = clampRetention(settings.retentionDays);
  const cutoffMsgs = isoNowMinusDays(effectiveDays);
  const cutoffAud = isoNowMinusDays(AUDIT_PURGE_DAYS);
  const dryRun = !!opts?.dryRun;

  if (settings.legalHold) {
    const meta = {
      skippedForLegalHold: true,
      counts: { messages: 0, model_invocations: 0, threads: 0, audit_logs: 0 },
      retentionDaysEffective: effectiveDays,
      batchSize: BATCH_SIZE,
      windowEndUTC: new Date().toISOString(),
    };
    await insertAudit(orgId, actorId, "retention.purge_run", meta);
    return meta;
  }

  let totalMessages = 0;
  let totalInvokes = 0;
  let totalThreads = 0;
  let totalAudits = 0;

  // messages
  while (true) {
    const ids = await selectIds("messages", { orgId, cutoffISO: cutoffMsgs }, BATCH_SIZE);
    if (ids.length === 0) break;
    if (!dryRun) totalMessages += await deleteByIds("messages", ids);
    if (ids.length < BATCH_SIZE) break;
  }

  // model_invocations
  while (true) {
    const ids = await selectIds("model_invocations", { orgId, cutoffISO: cutoffMsgs }, BATCH_SIZE);
    if (ids.length === 0) break;
    if (!dryRun) totalInvokes += await deleteByIds("model_invocations", ids);
    if (ids.length < BATCH_SIZE) break;
  }

  // audit_logs (> 365d)
  while (true) {
    const ids = await selectIds("audit_logs", { orgId, cutoffISO: cutoffAud }, BATCH_SIZE);
    if (ids.length === 0) break;
    if (!dryRun) totalAudits += await deleteByIds("audit_logs", ids);
    if (ids.length < BATCH_SIZE) break;
  }

  // orphan threads
  while (true) {
    const ids = await selectIds("threads", { orgId, orphanThreads: true }, BATCH_SIZE);
    if (ids.length === 0) break;
    if (!dryRun) totalThreads += await deleteByIds("threads", ids);
    if (ids.length < BATCH_SIZE) break;
  }

  const meta = {
    skippedForLegalHold: false,
    counts: {
      messages: totalMessages,
      model_invocations: totalInvokes,
      threads: totalThreads,
      audit_logs: totalAudits,
    },
    retentionDaysEffective: effectiveDays,
    batchSize: BATCH_SIZE,
    windowEndUTC: new Date().toISOString(),
  };

  await insertAudit(orgId, actorId, "retention.purge_run", meta);
  return meta;
}

export async function listOrgIds(): Promise<string[]> {
  const all: string[] = [];
  let from = 0;
  const page = 200;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("orgs")
      .select("id")
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r: any) => r.id as string);
    all.push(...ids);
    if (ids.length < page) break;
    from += page;
  }
  return all;
}
