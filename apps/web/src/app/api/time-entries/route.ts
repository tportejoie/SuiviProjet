import { NextResponse } from "next/server";
import { listMonthEntries, upsertTimeEntry } from "../../../../server/api/imputations";
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

  if (!projectId) {
    return jsonError("Missing projectId", 400);
  }

  const accessResponse = await ensureProjectAccess(projectId, user);
  if (accessResponse) {
    return accessResponse;
  }

  if (year && month) {
    const entries = await listMonthEntries({
      projectId,
      year: Number(year),
      month: Number(month)
    });
    return NextResponse.json(entries);
  }

  const entries = await prisma.timeEntry.findMany({
    where: { projectId },
    orderBy: [{ year: "asc" }, { month: "asc" }, { day: "asc" }, { type: "asc" }, { hourSlot: "asc" }]
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (response) {
      return response;
    }

    const payload = await request.json();
    const accessResponse = await ensureProjectAccess(payload.projectId, user);
    if (accessResponse) {
      return accessResponse;
    }
    const entry = await upsertTimeEntry({
      ...payload,
      actorName: payload.actorName || user.name || user.email
    });
    return NextResponse.json(entry);
  } catch (error) {
    const err = error as Error & { code?: string };
    if (err.code === "PERIOD_LOCKED") {
      return jsonError("Period locked", 423);
    }
    return jsonError("Failed to save entry", 500);
  }
}

