import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/server/auth";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bootstrapAdminIfNeeded = async (email: string, password: string) => {
  const userCount = await prisma.user.count();
  if (userCount > 0) return null;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) return null;
  if (email.toLowerCase() !== adminEmail.toLowerCase()) return null;
  if (password !== adminPassword) return null;

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      name: "Administrateur",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });
};

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return jsonError("Missing credentials", 400);
  }

  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    user = await bootstrapAdminIfNeeded(email, password);
  }

  if (!user || !user.active) {
    return jsonError("Invalid credentials", 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return jsonError("Invalid credentials", 401);
  }

  const session = await createSession(user.id);
  setSessionCookie(session.token, session.expiresAt);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

