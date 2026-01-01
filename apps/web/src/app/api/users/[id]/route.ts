import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { response } = await requireAdmin();
  if (response) {
    return response;
  }

  const payload = await request.json();
  const data: {
    name?: string | null;
    email?: string;
    role?: "ADMIN" | "USER";
    active?: boolean;
    passwordHash?: string;
  } = {};

  if (payload.name !== undefined) data.name = payload.name || null;
  if (payload.email) data.email = payload.email.toLowerCase();
  if (payload.role) data.role = payload.role === "ADMIN" ? "ADMIN" : "USER";
  if (payload.active !== undefined) data.active = Boolean(payload.active);
  if (payload.password) {
    data.passwordHash = await bcrypt.hash(payload.password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    active: updated.active,
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { user, response } = await requireAdmin();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }
  if (user.id === params.id) {
    return jsonError("Cannot delete self", 400);
  }

  await prisma.session.deleteMany({ where: { userId: params.id } });
  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

