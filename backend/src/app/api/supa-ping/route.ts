import { NextResponse } from "next/server";

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN ?? "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}
function makeCorsHeaders(origin: string): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", origin);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Credentials", "true");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return h;
}

function trimEndSlash(u: string) { return u.replace(/\/+$/, ""); }

export async function GET(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const headers = allowed.includes(origin) ? makeCorsHeaders(origin) : new Headers();

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

  return new NextResponse(JSON.stringify({
    ok: true,
    env: { url: Boolean(url), anon, service_role: svc },
    auth: { status: authStatus, body: authBody }
  }), { status: 200, headers });
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const headers = allowed.includes(origin) ? makeCorsHeaders(origin) : new Headers();
  return new NextResponse(null, { status: 204, headers });
}
