import { NextResponse } from "next/server";

function trimEndSlash(u: string) { return u.replace(/\/+$/, ""); }

export async function GET() {
  const url = process.env.SUPABASE_URL ?? "";
  const anon = process.env.SUPABASE_ANON_KEY ? "present" : "missing";
  const svc  = process.env.SUPABASE_SERVICE_ROLE ? "present" : "missing";

  let authStatus = 0;
  let authBody: unknown = null;

  try {
    if (url) {
      const res = await fetch(`${trimEndSlash(url)}/auth/v1/health`, { cache: "no-store" });
      authStatus = res.status;
      try { authBody = await res.json(); } catch { authBody = await res.text(); }
    }
  } catch (e: any) {
    authBody = { error: String(e?.message || e) };
  }

  return NextResponse.json({
    ok: true,
    env: { url: Boolean(url), anon, service_role: svc },
    auth: { status: authStatus, body: authBody }
  });
}
