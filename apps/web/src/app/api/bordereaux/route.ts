import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureProjectAccess, requireUser } from "@/server/authz";
import { jsonError } from "@/server/http";

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

  const bordereaux = await prisma.bordereau.findMany({
    where: { projectId },
    include: {
      agreement: {
        select: { id: true, providerId: true, status: true, auditFileId: true }
      },
      versions: {
        include: { file: true },
        orderBy: { versionNumber: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(bordereaux);
}


