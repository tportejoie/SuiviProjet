import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json();
  const email = String(payload.email || "").toLowerCase();
  const password = String(payload.password || "");
  const name = payload.name ? String(payload.name) : null;

  if (!email || !password) {
    return jsonError("Missing fields", 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("Email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "USER",
      active: true
    }
  });

  return NextResponse.json({
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role,
    active: created.active
  }, { status: 201 });
}
