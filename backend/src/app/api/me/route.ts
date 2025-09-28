import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureUser, resolveOrgId, resolveEmail } from "@/lib/membership";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  try {
    const userId = await ensureUser(session); // internal id
    const orgId  = await resolveOrgId(userId);
    const email  = resolveEmail(session);
    return NextResponse.json({ ok: true, userId, orgId, email });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
