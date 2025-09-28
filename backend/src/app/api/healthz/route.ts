import { NextResponse } from "next/server";
import { add } from "@shared/utils/math";
import type { HiveUser } from "@shared/types/hive";

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

export async function GET(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const headers = allowed.includes(origin) ? makeCorsHeaders(origin) : new Headers();

  const sum = add(5, 7);
  const user: HiveUser = { id: "42", name: "Backend Bee" };
  return new NextResponse(JSON.stringify({ ok: true, sum, user }), { status: 200, headers });
}

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const headers = allowed.includes(origin) ? makeCorsHeaders(origin) : new Headers();
  return new NextResponse(null, { status: 204, headers });
}

