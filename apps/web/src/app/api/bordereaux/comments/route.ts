import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProjectAccess, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) {
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

  const comments = await prisma.bordereauComment.findMany({
    where: {
      projectId,
      year: Number(year),
      month: Number(month)
    },
    orderBy: [{ day: "asc" }, { type: "asc" }]
  });

  return NextResponse.json(comments);
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }

  const payload = await request.json();
  if (!payload.projectId || payload.year === undefined || payload.month === undefined || payload.day === undefined || !payload.type) {
    return jsonError("Missing fields", 400);
  }

  const accessResponse = await ensureProjectAccess(payload.projectId, user);
  if (accessResponse) {
    return accessResponse;
  }

  const commentText = String(payload.comment || "");

  const comment = await prisma.bordereauComment.upsert({
    where: {
      projectId_year_month_day_type: {
        projectId: payload.projectId,
        year: Number(payload.year),
        month: Number(payload.month),
        day: Number(payload.day),
        type: payload.type
      }
    },
    update: { comment: commentText },
    create: {
      projectId: payload.projectId,
      year: Number(payload.year),
      month: Number(payload.month),
      day: Number(payload.day),
      type: payload.type,
      comment: commentText
    }
  });

  return NextResponse.json(comment);
}

