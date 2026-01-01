import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

const mapProject = (project: any) => ({
  ...project,
  atMetrics: project.atDaysSoldBO !== null || project.atDaysSoldSite !== null ? {
    daysSoldBO: project.atDaysSoldBO ?? 0,
    daysSoldSite: project.atDaysSoldSite ?? 0,
    dailyRateBO: project.atDailyRateBO ?? 0,
    dailyRateSite: project.atDailyRateSite ?? 0
  } : undefined
});

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const existing = await prisma.project.findUnique({
    where: { id: context.params.id },
    select: { projectManagerEmail: true },
  });
  if (!existing) {
    return jsonError("Not found", 404);
  }
  if (user.role !== "ADMIN" && existing.projectManagerEmail !== user.email) {
    return jsonError("Forbidden", 403);
  }

  const payload = await request.json();
  if (user.role !== "ADMIN" && payload.projectManagerEmail && payload.projectManagerEmail.toLowerCase() !== user.email) {
    return jsonError("Forbidden", 403);
  }
  const updated = await prisma.project.update({
    where: { id: context.params.id },
    data: {
      projectNumber: payload.projectNumber,
      orderNumber: payload.orderNumber,
      orderDate: new Date(payload.orderDate),
      orderAmount: payload.orderAmount ?? null,
      quoteNumber: payload.quoteNumber,
      quoteDate: new Date(payload.quoteDate),
      clientId: payload.clientId,
      contactId: payload.contactId,
      designation: payload.designation,
      projectManager: payload.projectManager,
      projectManagerEmail: payload.projectManagerEmail ? payload.projectManagerEmail.toLowerCase() : null,
      type: payload.type,
      status: payload.status,
      atDaysSoldBO: payload.atMetrics?.daysSoldBO ?? null,
      atDaysSoldSite: payload.atMetrics?.daysSoldSite ?? null,
      atDailyRateBO: payload.atMetrics?.dailyRateBO ?? null,
      atDailyRateSite: payload.atMetrics?.dailyRateSite ?? null
    }
  });
  return NextResponse.json(mapProject(updated));
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const projectId = context.params.id;
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { projectManagerEmail: true },
  });
  if (!existing) {
    return jsonError("Not found", 404);
  }
  if (user.role !== "ADMIN" && existing.projectManagerEmail !== user.email) {
    return jsonError("Forbidden", 403);
  }

  const [timeEntries, snapshots, deliverables, bordereaux] = await Promise.all([
    prisma.timeEntry.count({ where: { projectId } }),
    prisma.projectSituationSnapshot.count({ where: { projectId } }),
    prisma.deliverable.count({ where: { projectId } }),
    prisma.bordereau.count({ where: { projectId } })
  ]);

  if (timeEntries > 0 || snapshots > 0 || deliverables > 0 || bordereaux > 0) {
    return jsonError("Project has related data and cannot be deleted.", 409);
  }

  await prisma.project.delete({ where: { id: projectId } });
  return NextResponse.json({ ok: true });
}

