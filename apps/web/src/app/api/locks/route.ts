import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProjectAccess, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response || !user) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!projectId || !year || !month) {
    return jsonError("Missing projectId/year/month", 400);
  }

  const accessResponse = await ensureProjectAccess(projectId, user);
  if (accessResponse) {
    return accessResponse;
  }

  const lock = await prisma.periodLock.findUnique({
    where: {
      projectId_year_month: {
        projectId,
        year: Number(year),
        month: Number(month)
      }
    }
  });

  return NextResponse.json(lock);
}
