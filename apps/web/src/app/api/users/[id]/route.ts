import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
  })));
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  const payload = await request.json();
  if (!payload.email || !payload.password) {
    return jsonError("Missing fields", 400);
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const created = await prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      name: payload.name || null,
      passwordHash,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
      active: payload.active !== false,
    },
  });

  return NextResponse.json({
    id: created.id,
    email: created.email,
    name: created.name,
    role: created.role,
    active: created.active,
  }, { status: 201 });
}

