import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
  });
}
