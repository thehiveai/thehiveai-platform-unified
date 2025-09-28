// src/integrations/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function getHealthz() {
  const res = await fetch(`${API_BASE}/api/healthz`, { credentials: "include" });
  if (!res.ok) throw new Error(`healthz failed: ${res.status}`);
  return res.json() as Promise<{ ok: boolean; sum: number; user: { id: string; name: string } }>;
}
