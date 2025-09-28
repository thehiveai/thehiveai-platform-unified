"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Rule = {
  id: string;
  pattern: string;
  is_blocking: boolean;
  description: string | null;
  created_at?: string;
};

export default function DlpPage() {
  const { data: session, status } = useSession();
  const orgId = useMemo(() => (session?.user as any)?.orgId as string | undefined, [session]);

  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // editor modal state
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pattern, setPattern] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [description, setDescription] = useState("");

  // test text
  const [testText, setTestText] = useState("");
  const [testOut, setTestOut] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const canUse = status === "authenticated" && !!orgId;

  async function load() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/dlp`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load rules");
      setRules(data.rules ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canUse) load();
  }, [canUse]);

  function openCreate() {
    setEditId(null);
    setPattern("");
    setDescription("");
    setIsBlocking(false);
    setOpen(true);
  }
  function openEdit(r: Rule) {
    setEditId(r.id);
    setPattern(r.pattern);
    setDescription(r.description ?? "");
    setIsBlocking(!!r.is_blocking);
    setOpen(true);
  }
  function closeModal() { setOpen(false); }

  async function saveRule() {
    if (!orgId) return;
    setError(null); setMsg(null);
    const body = { pattern, is_blocking: isBlocking, description };
    try {
      const url = editId
        ? `/api/admin/orgs/${orgId}/dlp/${editId}`
        : `/api/admin/orgs/${orgId}/dlp`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setMsg(editId ? "Rule updated" : "Rule created");
      setOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  }

  async function deleteRule(id: string) {
    if (!orgId) return;
    const typed = prompt('Type "DELETE" to confirm removal of this rule');
    if (typed !== "DELETE") return;
    setError(null); setMsg(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/dlp/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setMsg("Rule deleted");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  }

  async function runTest() {
    if (!orgId) return;
    setTesting(true);
    setTestOut(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/dlp/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Test failed");
      setTestOut(data);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">DLP Rules</h1>
          <p className="text-sm opacity-80">
            Create regex rules that detect (and optionally block) sensitive data before it reaches any model.
          </p>
        </header>

        {/* actions */}
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="border rounded-lg px-4 py-2">Add Rule</button>
          <button onClick={load} className="border rounded-lg px-4 py-2">Refresh</button>
        </div>

        {(error || msg) && (
          <div className="text-sm">
            {error && <p className="text-red-600">Error: {error}</p>}
            {msg && <p className="text-green-600">{msg}</p>}
          </div>
        )}

        {/* rules table */}
        <section className="rounded-2xl border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left">Pattern</th>
                <th className="p-3 text-left">Blocking</th>
                <th className="p-3 text-left">Description</th>
                <th className="p-3 text-left">Created</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="p-3" colSpan={5}>Loading…</td></tr>
              ) : rules.length === 0 ? (
                <tr><td className="p-3" colSpan={5}>No rules yet.</td></tr>
              ) : (
                rules.map(r => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="p-3 font-mono break-words">{r.pattern}</td>
                    <td className="p-3">{r.is_blocking ? "Yes" : "No"}</td>
                    <td className="p-3">{r.description || "—"}</td>
                    <td className="p-3">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button className="border rounded-lg px-3 py-1" onClick={() => openEdit(r)}>Edit</button>
                        <button className="border rounded-lg px-3 py-1" onClick={() => deleteRule(r.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* Test Tool */}
        <section className="rounded-2xl border p-4 space-y-3">
          <h2 className="font-medium">Test Text Against Current Rules</h2>
          <textarea
            className="border rounded-lg w-full p-3 font-mono min-h-[140px]"
            placeholder="Paste sample text here..."
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button className="border rounded-lg px-4 py-2" onClick={runTest} disabled={!testText || testing}>
              {testing ? "Testing…" : "Run Test"}
            </button>
            {testOut && (
              <span className={`text-sm ${testOut.blocked ? "text-red-600" : "text-green-600"}`}>
                {testOut.blocked ? "Blocked by at least one rule" : "No blocking rules matched"}
              </span>
            )}
          </div>
          {testOut?.results?.length ? (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium mb-2">Matches</p>
              <ul className="space-y-2">
                {testOut.results.map((r: any) => (
                  <li key={r.id} className="border rounded p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full border">{r.is_blocking ? "BLOCK" : "ALLOW"}</span>
                      <span className="text-xs opacity-70">rule: {r.id}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-80">{r.description || "—"}</div>
                    <pre className="mt-2 text-xs overflow-x-auto">{JSON.stringify(r.matches, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Modal */}
        {open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-2xl shadow-lg p-6 space-y-4">
              <h3 className="text-lg font-semibold">{editId ? "Edit Rule" : "Add Rule"}</h3>
              <label className="block text-sm mb-1">Pattern (Regular Expression)</label>
              <textarea
                className="border rounded-lg w-full p-3 font-mono min-h-[100px]"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder={`e.g. \\b\\d{3}-\\d{2}-\\d{4}\\b for US SSN`}
              />
              <div className="flex items-center gap-2">
                <input id="isBlocking" type="checkbox" checked={isBlocking} onChange={(e) => setIsBlocking(e.target.checked)} />
                <label htmlFor="isBlocking" className="text-sm">Block when matched</label>
              </div>
              <label className="block text-sm mb-1">Description</label>
              <input
                className="border rounded-lg w-full p-3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule detects"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button className="border rounded-lg px-4 py-2" onClick={closeModal}>Cancel</button>
                <button className="border rounded-lg px-4 py-2" onClick={saveRule} disabled={!pattern.trim()}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
