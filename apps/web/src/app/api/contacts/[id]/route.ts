import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const contactId = context.params.id;
  const payload = await request.json();

  const hasUpdates =
    typeof payload.active === "boolean" ||
    typeof payload.name === "string" ||
    typeof payload.email === "string" ||
    typeof payload.role === "string" ||
    typeof payload.phone === "string" ||
    payload.phone === null;

  if (!hasUpdates) {
    return jsonError("Missing fields", 400);
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      client: {
        include: {
          projects: true
        }
      }
    }
  });

  if (!contact) {
    return jsonError("Not found", 404);
  }

  if (user.role !== "ADMIN") {
    const hasAccess = contact.client.projects.some(
      (project) => project.projectManagerEmail === user.email
    );
    if (!hasAccess) {
      return jsonError("Forbidden", 403);
    }
  }

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(typeof payload.active === "boolean" ? { active: payload.active } : {}),
      ...(typeof payload.name === "string" ? { name: payload.name.trim() } : {}),
      ...(typeof payload.email === "string" ? { email: payload.email.trim() } : {}),
      ...(typeof payload.role === "string" ? { role: payload.role.trim() } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone } : {})
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const contactId = context.params.id;
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      client: {
        include: {
          projects: true
        }
      }
    }
  });

  if (!contact) {
    return jsonError("Not found", 404);
  }

  if (user.role !== "ADMIN") {
    const hasAccess = contact.client.projects.some(
      (project) => project.projectManagerEmail === user.email
    );
    if (!hasAccess) {
      return jsonError("Forbidden", 403);
    }
  }

  try {
    await prisma.contact.delete({ where: { id: contactId } });
  } catch (error) {
    return jsonError("Contact linked to projects", 409);
  }

  return NextResponse.json({ ok: true });
}
