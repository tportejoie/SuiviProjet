import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProjectAccess, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";
import { DeliverableStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return jsonError("Missing projectId", 400);
  }

  const accessResponse = await ensureProjectAccess(projectId, user);
  if (accessResponse) {
    return accessResponse;
  }

  const deliverables = await prisma.deliverable.findMany({
    where: { projectId },
    orderBy: { targetDate: "asc" }
  });
  return NextResponse.json(deliverables);
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const { user, response } = await requireUser();
  if (response) {
    return response;
  }
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const deliverableId = context.params.id;
  const payload = await request.json();
  const status = payload?.status as DeliverableStatus | undefined;

  if (!status || !(status in DeliverableStatus)) {
    return jsonError("Invalid status", 400);
  }

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId }
  });

  if (!deliverable) {
    return jsonError("Deliverable not found", 404);
  }

  const accessResponse = await ensureProjectAccess(deliverable.projectId, user);
  if (accessResponse) {
    return accessResponse;
  }

  const updated = await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      status,
      submissionDate: status === DeliverableStatus.REMIS ? new Date() : deliverable.submissionDate
    }
  });

  return NextResponse.json(updated);
}


