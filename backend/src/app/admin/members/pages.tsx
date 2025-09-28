"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Member = {
  userId: string;
  role: "owner" | "admin" | "member";
  email?: string | null;
  name?: string | null;
  joinedAt?: string;
};

export default function MembersPage() {
  const { data: session, status } = useSession();
  const orgId = useMemo(() => (session?.user as any)?.orgId as string | undefined, [session]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin" | "owner">("member");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/members`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load members");
      setMembers(data.members ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId: string, role: Member["role"]) {
    if (!orgId) return;
    setError(null); setMsg(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Update failed");
      setMsg("Role updated");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  }

  async function removeMember(userId: string) {
    if (!orgId) return;
    if (!confirm("Type YES to confirm removal").valueOf) {
      const typed = prompt('Please type "YES" to confirm removal');
      if (typed !== "YES") return;
    }
    setError(null); setMsg(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Remove failed");
      setMsg("Member removed");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  }

  async function sendInvite() {
    if (!orgId) return;
    setError(null); setMsg(null);
    try {
      const res = await fetch(`/api/admin/orgs/${orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Invite failed");
      setMsg("Invite sent.");
      setInviteEmail("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Error");
    }
  }

  useEffect(() => {
    if (status === "authenticated" && orgId) load();
  }, [status, orgId]);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="opacity-80 text-sm">Manage roles, remove members, and send invites.</p>
        </header>

        {/* Invite Form */}
        <section className="rounded-2xl border p-4">
          <h2 className="font-medium mb-3">Send Invite</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="border rounded-lg px-3 py-2 flex-1"
              type="email"
              placeholder="email@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="border rounded-lg px-3 py-2"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            <button
              className="border rounded-lg px-4 py-2"
              onClick={sendInvite}
              disabled={!inviteEmail}
            >
              Send
            </button>
          </div>
          <p className="text-xs opacity-70 mt-2">
            Invites require the recipient to sign in with the exact invited email. Acceptance is audit-logged.
          </p>
        </section>

        {/* Messages */}
        {(error || msg) && (
          <div className="text-sm">
            {error && <p className="text-red-600">Error: {error}</p>}
            {msg && <p className="text-green-600">{msg}</p>}
          </div>
        )}

        {/* Members Table */}
        <section className="rounded-2xl border">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-left p-3">Joined</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="p-3" colSpan={5}>Loading…</td></tr>
                ) : members.length === 0 ? (
                  <tr><td className="p-3" colSpan={5}>No members yet.</td></tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.userId} className="border-b">
                      <td className="p-3">{m.name || "—"}</td>
                      <td className="p-3">{m.email || "—"}</td>
                      <td className="p-3">
                        <select
                          className="border rounded-lg px-2 py-1"
                          value={m.role}
                          onChange={(e) => changeRole(m.userId, e.target.value as Member["role"])}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </td>
                      <td className="p-3">{m.joinedAt ? new Date(m.joinedAt).toLocaleString() : "—"}</td>
                      <td className="p-3 text-right">
                        <button
                          className="border rounded-lg px-3 py-1"
                          onClick={() => removeMember(m.userId)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
