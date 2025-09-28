"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Settings = {
  modelEnabled: { openai: boolean; gemini: boolean; anthropic: boolean };
  retentionDays: number;
  legalHold: boolean;
};

export function useOrgSettings() {
  const { data: session, status } = useSession();
  const orgId = (session?.user as any)?.orgId as string | undefined;

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !orgId) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setErr(null);
      try {
        const res = await fetch(`/api/admin/orgs/${orgId}/settings`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load settings");
        if (!cancelled) setSettings(data.settings);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [status, orgId]);

  return { settings, loading, err };
}
