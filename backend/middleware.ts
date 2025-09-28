import { NextResponse, NextRequest } from "next/server";

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGIN ?? "";
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const origin = req.headers.get("origin") || "";
  const allowed = getAllowedOrigins();

  if (origin && allowed.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", req.headers.get("access-control-request-headers") ?? "*");

    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: res.headers });
    }
  } else if (req.method === "OPTIONS") {
    // For non-allowed origins, reply quickly to preflight
    return new NextResponse(null, { status: 204 });
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
