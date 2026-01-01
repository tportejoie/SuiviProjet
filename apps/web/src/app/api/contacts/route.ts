import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }

  const contacts = await prisma.contact.findMany({
    where: user.role === "ADMIN"
      ? undefined
      : {
          client: {
            projects: {
              some: { projectManagerEmail: user.email }
            }
          }
        },
    orderBy: { name: "asc" }
  });
  return NextResponse.json(contacts);
}

export async function POST(request: Request) {
  const { response } = await requireUser();
  if (response) {
    return response;
  }

  const payload = await request.json();
  if (!payload.clientId || !payload.firstName || !payload.lastName || !payload.role || !payload.email) {
    return jsonError("Missing fields", 400);
  }
  const contact = await prisma.contact.create({
    data: {
      clientId: payload.clientId,
      name: `${payload.firstName} ${payload.lastName}`.trim(),
      email: payload.email,
      role: payload.role,
      phone: null,
      active: true
    }
  });
  return NextResponse.json(contact, { status: 201 });
}

