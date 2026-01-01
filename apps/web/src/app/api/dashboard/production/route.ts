import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/authz";

export const runtime = "nodejs";

const MONTHS = 12;

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year") || new Date().getFullYear());

  const projects = await prisma.project.findMany({
    where: user.role === "ADMIN" ? undefined : { projectManagerEmail: user.email },
    select: {
      id: true,
      type: true,
      orderAmount: true,
      atDaysSoldBO: true,
      atDaysSoldSite: true,
      atDailyRateBO: true,
      atDailyRateSite: true
    }
  });

  const projectIds = projects.map(p => p.id);
  if (projectIds.length === 0) {
    return NextResponse.json({ year, data: Array.from({ length: MONTHS }, () => ({ at: 0, forfait: 0 })) });
  }

  const timeEntries = await prisma.timeEntry.findMany({
    where: { projectId: { in: projectIds }, year },
    select: { projectId: true, month: true, type: true, hours: true }
  });

  const deliverables = await prisma.deliverable.findMany({
    where: {
      projectId: { in: projectIds },
      status: { in: ["REMIS", "VALIDE"] },
      submissionDate: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1)
      }
    },
    select: { projectId: true, submissionDate: true, percentage: true, amount: true }
  });

  const projectMap = new Map(projects.map(p => [p.id, p]));
  const data = Array.from({ length: MONTHS }, () => ({ at: 0, forfait: 0 }));

  for (const entry of timeEntries) {
    const project = projectMap.get(entry.projectId);
    if (!project || project.type !== "AT") continue;
    const month = entry.month;
    const dailyRate = entry.type === "BO" ? (project.atDailyRateBO ?? 0) : (project.atDailyRateSite ?? 0);
    const amount = (entry.hours / 8) * dailyRate;
    if (month >= 0 && month < MONTHS) {
      data[month].at += amount;
    }
  }

  for (const deliverable of deliverables) {
    const project = projectMap.get(deliverable.projectId);
    if (!project || project.type !== "FORFAIT" || !deliverable.submissionDate) continue;
    const month = deliverable.submissionDate.getMonth();
    const amount = deliverable.amount ?? ((project.orderAmount ?? 0) * (deliverable.percentage / 100));
    if (month >= 0 && month < MONTHS) {
      data[month].forfait += amount;
    }
  }

  return NextResponse.json({ year, data });
}

