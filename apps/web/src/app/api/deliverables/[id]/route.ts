import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response || !user) {
    return response;
  }

  const existing = await prisma.deliverable.findUnique({
    where: { id: context.params.id },
    select: { project: { select: { projectManagerEmail: true } } },
  });
  if (!existing) {
    return jsonError("Not found", 404);
  }
  if (user.role !== "ADMIN" && existing.project.projectManagerEmail !== user.email) {
    return jsonError("Forbidden", 403);
  }

  const payload = await request.json();
  const status = payload.status as string;

  const updated = await prisma.deliverable.update({
    where: { id: context.params.id },
    data: {
      status,
      submissionDate: status === "REMIS" ? new Date() : undefined
    }
  });

  return NextResponse.json(updated);
}
