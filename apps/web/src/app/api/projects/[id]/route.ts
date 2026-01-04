import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProjectAccess, requireAdmin, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

const mapProject = (project: any) => ({
  ...project,
  atMetrics: project.atDaysSoldBO !== null || project.atDaysSoldSite !== null ? {
    daysSoldBO: project.atDaysSoldBO ?? 0,
    daysSoldSite: project.atDaysSoldSite ?? 0,
    dailyRateBO: project.atDailyRateBO ?? 0,
    dailyRateSite: project.atDailyRateSite ?? 0
  } : undefined
});

export async function GET(_: Request, { params }: RouteContext) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });
  if (!project) {
    return jsonError("Project not found", 404);
  }

  const accessResponse = await ensureProjectAccess(project.id, user);
  if (accessResponse) {
    return accessResponse;
  }

  return NextResponse.json(mapProject(project));
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const existing = await prisma.project.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return jsonError("Project not found", 404);
  }

  const accessResponse = await ensureProjectAccess(existing.id, user);
  if (accessResponse) {
    return accessResponse;
  }

  const payload = await request.json();
  const data: Record<string, unknown> = {};

  if (payload.projectNumber !== undefined) data.projectNumber = payload.projectNumber;
  if (payload.orderNumber !== undefined) data.orderNumber = payload.orderNumber;
  if (payload.orderDate !== undefined) data.orderDate = new Date(payload.orderDate);
  if (payload.orderAmount !== undefined) data.orderAmount = payload.orderAmount;
  if (payload.quoteNumber !== undefined) data.quoteNumber = payload.quoteNumber;
  if (payload.quoteDate !== undefined) data.quoteDate = new Date(payload.quoteDate);
  if (payload.clientId !== undefined) data.clientId = payload.clientId;
  if (payload.contactId !== undefined) data.contactId = payload.contactId;
  if (payload.designation !== undefined) data.designation = payload.designation;
  if (payload.projectManager !== undefined) data.projectManager = payload.projectManager;
  if (payload.projectManagerEmail !== undefined) data.projectManagerEmail = payload.projectManagerEmail?.toLowerCase() || null;
  if (payload.type !== undefined) data.type = payload.type;
  if (payload.status !== undefined) data.status = payload.status;

  if (payload.atMetrics) {
    data.atDaysSoldBO = payload.atMetrics.daysSoldBO ?? null;
    data.atDaysSoldSite = payload.atMetrics.daysSoldSite ?? null;
    data.atDailyRateBO = payload.atMetrics.dailyRateBO ?? null;
    data.atDailyRateSite = payload.atMetrics.dailyRateSite ?? null;
  }

  const updated = await prisma.project.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(mapProject(updated));
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";

  if (force) {
    const { response: adminResponse } = await requireAdmin();
    if (adminResponse) {
      return adminResponse;
    }
  } else {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            timeEntries: true,
            deliverables: true,
            snapshots: true,
            bordereaux: true,
            bordereauComments: true,
            locks: true
          }
        }
      }
    });

    if (!project) {
      return jsonError("Project not found", 404);
    }

    const accessResponse = await ensureProjectAccess(project.id, user);
    if (accessResponse) {
      return accessResponse;
    }

    const hasData =
      project._count.timeEntries > 0 ||
      project._count.deliverables > 0 ||
      project._count.snapshots > 0 ||
      project._count.bordereaux > 0 ||
      project._count.bordereauComments > 0 ||
      project._count.locks > 0;

    if (hasData) {
      return jsonError("Project has related data", 409);
    }
  }

  if (force) {
    await prisma.$transaction([
      prisma.bordereauVersion.deleteMany({
        where: { bordereau: { projectId: params.id } }
      }),
      prisma.adobeAgreement.deleteMany({
        where: { bordereau: { projectId: params.id } }
      }),
      prisma.bordereauComment.deleteMany({
        where: { projectId: params.id }
      }),
      prisma.bordereau.deleteMany({
        where: { projectId: params.id }
      }),
      prisma.projectSituationSnapshot.deleteMany({
        where: { projectId: params.id }
      }),
      prisma.timeEntry.deleteMany({
        where: { projectId: params.id }
      }),
      prisma.deliverable.deleteMany({
        where: { projectId: params.id }
      }),
      prisma.periodLock.deleteMany({
        where: { projectId: params.id }
      }),
      prisma.project.deleteMany({
        where: { id: params.id }
      })
    ]);
  } else {
    await prisma.project.delete({
      where: { id: params.id }
    });
  }

  return NextResponse.json({ deleted: true });
}
