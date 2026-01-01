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

const padProjectNumber = (value: number) => value.toString().padStart(3, "0");

const getNextProjectNumber = async (year: number) => {
  const prefix = `PRJ-${year}-`;
  const projects = await prisma.project.findMany({
    where: {
      projectNumber: { startsWith: prefix }
    },
    select: { projectNumber: true }
  });
  const max = projects.reduce((acc, project) => {
    const match = project.projectNumber.replace(prefix, "");
    const parsed = Number(match);
    if (Number.isFinite(parsed)) {
      return Math.max(acc, parsed);
    }
    return acc;
  }, 0);
  return `${prefix}${padProjectNumber(max + 1)}`;
};

export async function GET() {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const where = user.role === "ADMIN"
    ? undefined
    : { projectManagerEmail: user.email };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { projectNumber: "asc" },
    include: {
      _count: {
        select: {
          timeEntries: true,
          deliverables: true,
          snapshots: true,
          bordereaux: true
        }
      }
    }
  });
  return NextResponse.json(projects.map((project) => ({
    ...mapProject(project),
    timeEntriesCount: project._count.timeEntries,
    deliverablesCount: project._count.deliverables,
    snapshotsCount: project._count.snapshots,
    bordereauxCount: project._count.bordereaux
  })));
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const payload = await request.json();
  const orderDate = payload.orderDate ? new Date(payload.orderDate) : new Date();
  const projectNumber = payload.projectNumber && payload.projectNumber.trim().length > 0
    ? payload.projectNumber
    : await getNextProjectNumber(orderDate.getFullYear());

  if (user.role !== "ADMIN" && payload.projectManagerEmail?.toLowerCase() !== user.email) {
    return jsonError("Forbidden", 403);
  }
  const created = await prisma.project.create({
    data: {
      projectNumber,
      orderNumber: payload.orderNumber,
      orderDate,
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
      atDailyRateSite: payload.atMetrics?.dailyRateSite ?? null,
      deliverables: payload.deliverables?.length
        ? {
            create: payload.deliverables.map((deliverable: any) => ({
              label: deliverable.label,
              percentage: deliverable.percentage ?? 0,
              amount: deliverable.amount ?? null,
              targetDate: new Date(deliverable.targetDate),
              status: "NON_REMIS"
            }))
          }
        : undefined
    }
  });
  return NextResponse.json(mapProject(created), { status: 201 });
}

