"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type AuditItem = {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  target_type: string | null;
  target_id: string | null;
  content_sha256: string | null;
  meta: any;
  created_at: string;
};

export default function AuditPage() {
  const { data: session, status } = useSession();
  const orgId = useMemo(() => (session?.user as any)?.orgId as string | undefined, [session]);

  const [items, setItems] = useState<AuditItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [since, setSince] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 16); // yyyy-mm-ddThh:mm for <input type="datetime-local">
  });
  const [until, setUntil] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [q, setQ] = useState("");

  async function load(reset = false) {
    if (!orgId) return;
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (!reset && cursor) params.set("cursor", cursor);
      if (actor.trim()) params.set("actor", actor.trim());
      if (action.trim()) params.set("action", action.trim());
      if (since) params.set("since", new Date(since).toISOString());
      if (until) params.set("until", new Date(until).toISOString());
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/admin/orgs/${orgId}/audits?` + params.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Load failed");

      setItems(reset ? data.items : [...items, ...data.items]);
      setHasMore(!!data.hasMore);
      setCursor(data.nextCursor);
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated" && orgId) {
      // initial load
      load(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, orgId]);

  function resetAndSearch() {
    setItems([]);
    setCursor(null);
    load(true);
  }

  function humanDate(iso?: string) {
    try { return iso ? new Date(iso).toLocaleString() : "—"; } catch { return iso || "—"; }
  }

  async function exportCsv() {
    if (!orgId) return;
    try {
      const params = new URLSearchParams();
      if (since) params.set("since", new Date(since).toISOString());
      if (until) params.set("until", new Date(until).toISOString());
      const res = await fetch(`/api/admin/orgs/${orgId}/audits/export?` + params.toString(), { cache: "no-store" });
      if (res.status === 403) {
        alert("Export is owner-only. Ask an owner to export.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_${orgId}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message ?? "Export failed");
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-sm opacity-80">
            Immutable activity records. Use filters to narrow the timeline. Export (owner-only) for compliance.
          </p>
        </header>

        {/* Filters */}
        <section className="rounded-2xl border p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Actor email (contains)</label>
            <input className="border rounded-lg w-full p-2" value={actor} onChange={(e)=>setActor(e.target.value)} placeholder="e.g. admin@firm.com" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Action (exact or prefix*)</label>
            <input className="border rounded-lg w-full p-2" value={action} onChange={(e)=>setAction(e.target.value)} placeholder='e.g. "dlp_rule.*" or "invite.accepted"' />
          </div>
          <div>
            <label className="block text-sm mb-1">Since</label>
            <input type="datetime-local" className="border rounded-lg w-full p-2" value={since} onChange={(e)=>setSince(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Until</label>
            <input type="datetime-local" className="border rounded-lg w-full p-2" value={until} onChange={(e)=>setUntil(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm mb-1">Search in metadata</label>
            <input className="border rounded-lg w-full p-2" value={q} onChange={(e)=>setQ(e.target.value)} placeholder='e.g. {"role":"admin"}' />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button className="border rounded-lg px-4 py-2" onClick={resetAndSearch}>Apply</button>
            <button className="border rounded-lg px-4 py-2" onClick={()=>{ setActor(""); setAction(""); setQ(""); }}>Clear</button>
            <button title="Owner-only" className="border rounded-lg px-4 py-2 ml-auto" onClick={exportCsv}>Export CSV</button>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-2xl border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left w-[180px]">Time</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Actor</th>
                <th className="p-3 text-left">Target</th>
                <th className="p-3 text-left">Meta</th>
                <th className="p-3 text-left">SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td className="p-3" colSpan={6}>{loading ? "Loading…" : "No results in range."}</td></tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="p-3 whitespace-nowrap">{humanDate(r.created_at)}</td>
                    <td className="p-3 font-mono">{r.action}</td>
                    <td className="p-3">{r.actor_email || "—"}</td>
                    <td className="p-3">{[r.target_type, r.target_id].filter(Boolean).join(": ") || "—"}</td>
                    <td className="p-3">
                      <pre className="text-xs max-w-[420px] overflow-x-auto">{JSON.stringify(r.meta ?? {}, null, 2)}</pre>
                    </td>
                    <td className="p-3 font-mono text-xs">{r.content_sha256 || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm opacity-70">{items.length} shown</div>
          <div className="flex gap-2">
            <button className="border rounded-lg px-4 py-2" disabled={loading || !hasMore} onClick={()=>load(false)}>
              {loading ? "Loading…" : "Load more"}
            </button>
            <button className="border rounded-lg px-4 py-2" onClick={()=>{ setItems([]); setCursor(null); load(true); }}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
