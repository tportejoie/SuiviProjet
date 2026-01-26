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

  if (typeof payload.active !== "boolean") {
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
    data: { active: payload.active }
  });

  return NextResponse.json(updated);
}
