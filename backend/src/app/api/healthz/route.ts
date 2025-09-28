import { NextResponse } from "next/server";
import { add } from "../../../../../shared/utils/math";
import type { HiveUser } from "../../../../../shared/types/hive";

export async function GET() {
  const sum = add(5, 7);
  const user: HiveUser = { id: "42", name: "Backend Bee" };
  return NextResponse.json({ ok: true, sum, user });
}
