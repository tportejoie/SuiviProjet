import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, SESSION_COOKIE } from "@/server/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
