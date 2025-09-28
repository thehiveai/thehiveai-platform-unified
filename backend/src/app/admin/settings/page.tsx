"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Settings = {
  modelEnabled: { openai: boolean; gemini: boolean; anthropic: boolean };
  retentionDays: number;
  legalHold: boolean;
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const orgId = useMemo(() => (session?.user as any)?.orgId as string | undefined, [session]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [defaults, setDefaults] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const canUse = status === "authenticated" && !!orgId;

  async function load() {
    if (!orgId) return;
    setLoading(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/settings`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load settings");
      setSettings(data.settings);
      setDefaults(data.defaults);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (canUse) load(); }, [canUse]);

  async function save(partial: Partial<Settings>) {
    if (!orgId) return;
    setSaving(true); setErr(null); setMsg(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSettings(data.settings);
      setMsg("Settings saved.");
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  function setModel(name: keyof Settings["modelEnabled"], enabled: boolean) {
    if (!settings) return;
    const next = { ...settings, modelEnabled: { ...settings.modelEnabled, [name]: enabled } };
    setSettings(next);
  }

  async function applyModelChanges() {
    if (!settings) return;
    await save({ modelEnabled: settings.modelEnabled });
  }

  async function applyRetention(n: number) {
    await save({ retentionDays: n });
  }

  async function toggleLegalHold(next: boolean) {
    if (!next) {
      const typed = prompt('Type "DISABLE" to turn off Legal Hold');
      if (typed !== "DISABLE") return;
    } else {
      const typed = prompt('Type "ENABLE" to turn on Legal Hold (retention locks)');
      if (typed !== "ENABLE") return;
    }
    await save({ legalHold: next });
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Tenant Settings</h1>
          <p className="text-sm opacity-80">Controls apply to your entire organization.</p>
        </header>

        {(err || msg) && (
          <div className="text-sm">
            {err && <p className="text-red-600">Error: {err}</p>}
            {msg && <p className="text-green-600">{msg}</p>}
          </div>
        )}

        {/* Loading state */}
        {loading || !settings ? (
          <p>Loading…</p>
        ) : (
          <>
            {/* Models */}
            <section className="rounded-2xl border p-4 space-y-3">
              <h2 className="font-medium">Model Access</h2>
              <p className="text-sm opacity-80">Enable or disable models for everyone in this org.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {(["openai", "gemini", "anthropic"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-3 border rounded-lg p-3">
                    <input
                      type="checkbox"
                      checked={settings.modelEnabled[m]}
                      onChange={(e) => setModel(m, e.target.checked)}
                    />
                    <span className="capitalize">{m}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-end">
                <button className="border rounded-lg px-4 py-2" onClick={applyModelChanges} disabled={saving}>
                  {saving ? "Saving…" : "Save Model Access"}
                </button>
              </div>
              {defaults && (
                <p className="text-xs opacity-60">Defaults: {JSON.stringify(defaults.modelEnabled)}</p>
              )}
            </section>

            {/* Retention */}
            <section className="rounded-2xl border p-4 space-y-3">
              <h2 className="font-medium">Retention</h2>
              <p className="text-sm opacity-80">
                Number of days to retain messages and audits. <strong>Owner-only.</strong>
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={3650}
                  className="border rounded-lg px-3 py-2 w-32"
                  value={settings.retentionDays}
                  onChange={(e) =>
                    setSettings({ ...settings, retentionDays: Math.max(1, Math.min(3650, Number(e.target.value) || 1)) })
                  }
                />
                <span className="text-sm">days</span>
                <button className="border rounded-lg px-4 py-2 ml-auto" onClick={() => applyRetention(settings.retentionDays)} disabled={saving}>
                  {saving ? "Saving…" : "Save Retention"}
                </button>
              </div>
              {defaults && (
                <p className="text-xs opacity-60">Default: {defaults.retentionDays} days</p>
              )}
            </section>

            {/* Legal Hold */}
            <section className="rounded-2xl border p-4 space-y-3">
              <h2 className="font-medium">Legal Hold</h2>
              <p className="text-sm opacity-80">
                Prevents deletion or purging of retained data while active. <strong>Owner-only.</strong>
              </p>
              <div className="flex items-center gap-3">
                <span className={`text-sm px-2 py-1 rounded-full border ${settings.legalHold ? "bg-red-50" : ""}`}>
                  {settings.legalHold ? "ACTIVE" : "INACTIVE"}
                </span>
                <button
                  className="border rounded-lg px-4 py-2 ml-auto"
                  onClick={() => toggleLegalHold(!settings.legalHold)}
                  disabled={saving}
                >
                  {settings.legalHold ? "Disable" : "Enable"}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
